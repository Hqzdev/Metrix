import { ConflictError } from './errors.js'

/**
 * Допустимые статусы бронирования.
 * Единственный источник истины — здесь и в Prisma schema.
 */
export type BookingStatus = 'active' | 'cancelled' | 'rescheduled'

/**
 * Граф допустимых переходов.
 *
 * active     — создано, ожидает выполнения
 * cancelled  — отменено пользователем или системой (терминальное)
 * rescheduled — перенесено (создаётся новое бронирование, старое переходит сюда)
 *
 * Переходы не в этом списке — ошибка: нельзя "оживить" отменённое бронирование
 * или перевести completed в rescheduled обходом бизнес-логики.
 */
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  active: ['cancelled', 'rescheduled'],
  rescheduled: ['cancelled'],
  cancelled: [],
}

/**
 * Проверяет допустимость перехода между статусами бронирования.
 *
 * Бросает ConflictError если переход не разрешён.
 * Это намеренно ConflictError (HTTP 409) — клиент должен перечитать
 * актуальное состояние бронирования и отправить корректный запрос.
 *
 * @example
 *   assertValidTransition('active', 'cancelled') // ok
 *   assertValidTransition('cancelled', 'active')  // throws ConflictError
 */
export function assertValidTransition(from: string, to: string): void {
  const allowedFrom = VALID_TRANSITIONS[from as BookingStatus]

  if (allowedFrom === undefined) {
    throw new ConflictError(`неизвестный статус бронирования: ${from}`)
  }

  if (!allowedFrom.includes(to as BookingStatus)) {
    throw new ConflictError(
      `недопустимый переход статуса: ${from} → ${to}. ` +
      `Разрешено: ${allowedFrom.length > 0 ? allowedFrom.join(', ') : 'терминальное состояние'}`,
    )
  }
}

/**
 * Возвращает список допустимых следующих статусов для данного состояния.
 * Используется для валидации входных данных и формирования UI.
 */
export function getAllowedTransitions(from: BookingStatus): BookingStatus[] {
  return VALID_TRANSITIONS[from] ?? []
}
