import type { AnalyticsFilter } from './analytics-service.js'

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ReportRecord = {
  reportId: string
  status: ReportStatus
  filter: AnalyticsFilter
  createdAt: Date
  pdfBuffer?: Buffer
  error?: string
}

export class ReportService {
  private readonly reports = new Map<string, ReportRecord>()

  createReport(filter: AnalyticsFilter): ReportRecord {
    const reportId = crypto.randomUUID()
    const record: ReportRecord = { reportId, status: 'pending', filter, createdAt: new Date() }
    this.reports.set(reportId, record)
    return record
  }

  getReport(reportId: string): ReportRecord | undefined {
    return this.reports.get(reportId)
  }

  markProcessing(reportId: string): void {
    const record = this.reports.get(reportId)
    if (record) record.status = 'processing'
  }

  markCompleted(reportId: string, pdfBuffer: Buffer): void {
    const record = this.reports.get(reportId)
    if (record) {
      record.status = 'completed'
      record.pdfBuffer = pdfBuffer
    }
  }

  markFailed(reportId: string, error: string): void {
    const record = this.reports.get(reportId)
    if (record) {
      record.status = 'failed'
      record.error = error
    }
  }
}
