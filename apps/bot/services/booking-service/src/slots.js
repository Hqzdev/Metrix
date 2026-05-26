/**
 * Возвращает три стандартных слота (утро / день / вечер) для сегодняшнего дня.
 * Слоты используются в legacy-flow и остаются совместимы с существующими бронями.
 */
export function createSlots(resourceId) {
    // Берём текущую дату и обнуляем минуты/секунды, чтобы слоты были ровными по часу.
    const today = new Date();
    today.setMinutes(0, 0, 0);
    // m/a/e — короткие suffix-ы для morning/afternoon/evening legacy-слотов.
    return [
        makeSlot(resourceId, 'm', today, 9, 12),
        makeSlot(resourceId, 'a', today, 13, 17),
        makeSlot(resourceId, 'e', today, 18, 21),
    ];
}
/**
 * Генерирует стандартные слоты (утро / день / вечер) для произвольной даты.
 *
 * @param resourceId  идентификатор ресурса
 * @param dateStr     дата в формате YYYYMMDD
 */
export function createSlotsForDate(resourceId, dateStr) {
    // Невалидная дата даёт пустой список, а не исключение.
    const base = parseDateStr(dateStr);
    if (!base)
        return [];
    // В id добавляем дату, чтобы одинаковые часы разных дней не конфликтовали.
    return [
        makeSlot(resourceId, `${dateStr}-m`, base, 9, 12),
        makeSlot(resourceId, `${dateStr}-a`, base, 13, 17),
        makeSlot(resourceId, `${dateStr}-e`, base, 18, 21),
    ];
} 
/**
 * Строит один кастомный слот из resourceId + дата + час начала + продолжительность.
 *
 * Формат slotId: `{resourceId}-{YYYYMMDD}-{H}-{DUR}`
 * Пример:        `loc1-room-01-20260523-9-2`
 *
 * Возвращает null если slotId не соответствует кастомному формату.
 */
export function parseCustomSlot(resourceId, slotId) {
    // Суффикс после resourceId: "-YYYYMMDD-H-DUR".
    const prefix = `${resourceId}-`;
    if (!slotId.startsWith(prefix))
        return null;
    const suffix = slotId.slice(prefix.length);
    // Разбиваем по последним двум дефисам: YYYYMMDD-H-DUR.
    const lastDash = suffix.lastIndexOf('-');
    if (lastDash === -1)
        return null;
    const durStr = suffix.slice(lastDash + 1);
    const rest = suffix.slice(0, lastDash);
    const midDash = rest.lastIndexOf('-');
    if (midDash === -1)
        return null;
    const hourStr = rest.slice(midDash + 1);
    const dateStr = rest.slice(0, midDash);
    // Дата должна быть строго YYYYMMDD.
    if (!/^\d{8}$/.test(dateStr))
        return null;
    // Час начала и длительность приходят строками из slotId.
    const hour = parseInt(hourStr, 10);
    const duration = parseInt(durStr, 10);
    // Час начала должен быть в пределах суток.
    if (!Number.isInteger(hour) || hour < 0 || hour > 23)
        return null;
    // Длительность ограничена, чтобы не создавать слишком длинные бронирования.
    if (!Number.isInteger(duration) || duration < 1 || duration > 8)
        return null;
    // Слот не должен пересекать границу следующего дня.
    if (hour + duration > 24)
        return null;
    // Парсим дату после проверки формата.
    const base = parseDateStr(dateStr);
    if (!base)
        return null;
    // start/end строятся на одной календарной дате.
    const start = new Date(base);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(base);
    end.setHours(hour + duration, 0, 0, 0);
    return {
        id: slotId,
        startsAt: fmt(start),
        startsAtIso: start.toISOString(),
        endsAt: fmt(end),
        endsAtIso: end.toISOString(),
    };
}
/**
 * Строит slotId для кастомного слота из компонентов.
 * Дублируется здесь для локального использования внутри booking-service.
 * Публичный контракт живёт в @metrix/contracts.
 */
export function buildCustomSlotId(resourceId, dateStr, hour, duration) {
    // Формат должен совпадать с parseCustomSlot.
    return `${resourceId}-${dateStr}-${hour}-${duration}`;
}
/**
 * Создаёт один стандартный слот.
 */
function makeSlot(resourceId, suffix, base, startH, endH) {
    // Копируем base, чтобы не менять исходную дату.
    const s = new Date(base);
    s.setHours(startH, 0, 0, 0);
    const e = new Date(base);
    e.setHours(endH, 0, 0, 0);
    return {
        id: `${resourceId}${suffix}`,
        startsAt: fmt(s),
        startsAtIso: s.toISOString(),
        endsAt: fmt(e),
        endsAtIso: e.toISOString(),
    };
}
/**
 * Парсит дату формата YYYYMMDD в Date.
 */
function parseDateStr(dateStr) {
    // Любой другой формат не принимаем.
    if (!/^\d{8}$/.test(dateStr))
        return null;
    // Месяц в JavaScript Date начинается с 0, поэтому вычитаем 1.
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = parseInt(dateStr.slice(6, 8), 10);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    // isNaN ловит невозможные даты после создания Date.
    if (isNaN(d.getTime()))
        return null;
    return d;
}
/**
 * Форматирует дату для отображения пользователю.
 */
function fmt(d) {
    // Используем русскую локаль, потому что основной UI ожидает такой формат времени.
    return new Intl.DateTimeFormat('ru', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short' }).format(d);
}
