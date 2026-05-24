// Report запись для фоновой генерации отчёта.
export type Report = {
  id: string
  type: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  filePath?: string
  error?: string
}
