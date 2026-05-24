// Pending invoice для оплаты бронирования.
export type PendingInvoice = {
  id: string
  amountMinorUnits: number
  status: 'pending' | 'paid_part' | 'completed' | 'failed' | 'expired'
  holdId?: string
  locationId: string
  paidAmountMinorUnits: number
  partNumber: number
  resourceId: string
  slotId: string
  telegramUserId: number
  totalAmountMinorUnits: number
  totalParts: number
}

// Payload создания invoice.
export type CreateInvoiceInput = {
  chatId: number
  messageId: number
  telegramUserId: number
  resourceId: string
  slotId: string
  currency: string
  providerToken: string
}
