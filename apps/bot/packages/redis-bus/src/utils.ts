export async function wait(ms: number): Promise<void> {
  // Небольшая пауза после Redis read errors.
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function readStreamField(fields: string[], name: string): string | undefined {
  // Redis Stream fields — плоский массив key/value.
  const index = fields.indexOf(name)
  return index === -1 ? undefined : fields[index + 1]
}

export function createDlqStreamName(stream: string): string {
  // DLQ stream строится из имени исходного stream.
  return `dlq:${stream}`
}
