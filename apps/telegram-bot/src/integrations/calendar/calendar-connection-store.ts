import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { CalendarConnection, CalendarProvider } from './types.js'

type StoredCalendarConnection = Omit<CalendarConnection, 'accessToken' | 'refreshToken'> & {
  accessToken?: string
  refreshToken: string
}

export class CalendarConnectionStore {
  private readonly encryptionSecret: string
  private readonly storePath: string

  constructor(options: { encryptionSecret?: string; storePath?: string }) {
    this.encryptionSecret = options.encryptionSecret ?? 'local-development-calendar-secret'
    this.storePath = options.storePath ?? resolve(process.cwd(), 'data/calendar-connections.json')
  }

  // возвращает все подключения календарей
  async listConnections(): Promise<CalendarConnection[]> {
    const stored = await this.readStore()
    return stored.map((connection) => this.decryptConnection(connection))
  }

  // возвращает подключения подходящие для конкретной брони
  async listConnectionsForBooking(input: { resourceId: string; telegramUserId: number }): Promise<CalendarConnection[]> {
    const connections = await this.listConnections()
    return connections.filter(
      (connection) =>
        (connection.scope === 'user' && connection.telegramUserId === input.telegramUserId) ||
        (connection.scope === 'resource' && connection.resourceId === input.resourceId),
    )
  }

  // возвращает подключения календарей конкретного ресурса
  async listResourceConnections(resourceId: string): Promise<CalendarConnection[]> {
    const connections = await this.listConnections()
    return connections.filter((connection) => connection.scope === 'resource' && connection.resourceId === resourceId)
  }

  // сохраняет подключение и заменяет старое с такими же ключами
  async saveConnection(connection: CalendarConnection): Promise<void> {
    const connections = await this.listConnections()
    const filtered = connections.filter(
      (item) =>
        !(
          item.provider === connection.provider &&
          item.scope === connection.scope &&
          item.telegramUserId === connection.telegramUserId &&
          item.resourceId === connection.resourceId
        ),
    )
    await this.writeStore([...filtered, connection].map((item) => this.encryptConnection(item)))
  }

  // обновляет подключение после refresh token
  async updateConnection(connection: CalendarConnection): Promise<void> {
    await this.saveConnection(connection)
  }

  // читает файл хранилища
  private async readStore(): Promise<StoredCalendarConnection[]> {
    try {
      return JSON.parse(await readFile(this.storePath, 'utf8')) as StoredCalendarConnection[]
    } catch (error) {
      if (isMissingFileError(error)) {
        return []
      }

      throw error
    }
  }

  // сохраняет файл хранилища
  private async writeStore(connections: StoredCalendarConnection[]): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true })
    await writeFile(this.storePath, `${JSON.stringify(connections, null, 2)}\n`)
  }

  // шифрует токены перед записью
  private encryptConnection(connection: CalendarConnection): StoredCalendarConnection {
    return {
      ...connection,
      accessToken: connection.accessToken ? encrypt(connection.accessToken, this.encryptionSecret) : undefined,
      refreshToken: encrypt(connection.refreshToken, this.encryptionSecret),
    }
  }

  // расшифровывает токены после чтения
  private decryptConnection(connection: StoredCalendarConnection): CalendarConnection {
    return {
      ...connection,
      accessToken: connection.accessToken ? decrypt(connection.accessToken, this.encryptionSecret) : undefined,
      refreshToken: decrypt(connection.refreshToken, this.encryptionSecret),
    }
  }
}

// шифрует строку через aes-256-gcm
function encrypt(value: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

// расшифровывает строку через aes-256-gcm
function decrypt(value: string, secret: string): string {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(secret), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// делает ключ фиксированной длины из секрета
function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

// проверяет что файл ещё не создан
function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

// парсит имя провайдера календаря
export function parseCalendarProvider(value: string): CalendarProvider | null {
  return value === 'google' || value === 'microsoft' ? value : null
}
