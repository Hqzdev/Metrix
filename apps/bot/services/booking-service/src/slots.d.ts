import type { AvailableSlot } from '@metrix/contracts';
/**
 * Возвращает три стандартных слота (утро / день / вечер) для сегодняшнего дня.
 * Слоты используются в legacy-flow и остаются совместимы с существующими бронями.
 */
export declare function createSlots(resourceId: string): AvailableSlot[];
/**
 * Генерирует стандартные слоты (утро / день / вечер) для произвольной даты.
 *
 * @param resourceId  идентификатор ресурса
 * @param dateStr     дата в формате YYYYMMDD
 */
export declare function createSlotsForDate(resourceId: string, dateStr: string): AvailableSlot[];
/**
 * Строит один кастомный слот из resourceId + дата + час начала + продолжительность.
 *
 * Формат slotId: `{resourceId}-{YYYYMMDD}-{H}-{DUR}`
 * Пример:        `loc1-room-01-20260523-9-2`
 *
 * Возвращает null если slotId не соответствует кастомному формату.
 */
export declare function parseCustomSlot(resourceId: string, slotId: string): AvailableSlot | null;
/**
 * Строит slotId для кастомного слота из компонентов.
 * Дублируется здесь для локального использования внутри booking-service.
 * Публичный контракт живёт в @metrix/contracts.
 */
export declare function buildCustomSlotId(resourceId: string, dateStr: string, hour: number, duration: number): string;
 