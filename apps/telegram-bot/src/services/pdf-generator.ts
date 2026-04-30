import PDFDocument from 'pdfkit'
import type { AnalyticsSummary, OccupancyHeatmapCell, PeakHour, ResourceUtilization } from './analytics-service.js'

type GeneratePdfInput = {
  summary: AnalyticsSummary
  heatmapCells: OccupancyHeatmapCell[]
  utilization: ResourceUtilization[]
  peakHours: PeakHour[]
}

export function generateAnalyticsPdf(data: GeneratePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    writeTitleSection(doc, data.summary)
    writeSummarySection(doc, data.summary)
    writeHeatmapSection(doc, data.heatmapCells, data.summary)
    writeUtilizationSection(doc, data.utilization, data.summary)
    writePeakHoursSection(doc, data.peakHours, data.summary)

    doc.end()
  })
}

function writeTitleSection(doc: PDFKit.PDFDocument, summary: AnalyticsSummary): void {
  doc.fontSize(20).font('Helvetica-Bold').text('Analytics Report', { align: 'center' })
  doc.moveDown(0.4)
  doc.fontSize(11).font('Helvetica').text(`Period: ${summary.period.dateFrom} – ${summary.period.dateTo}`, { align: 'center' })
  doc.fontSize(10).fillColor('#888888').text(`Generated: ${new Date().toISOString().slice(0, 10)}`, { align: 'center' })
  doc.fillColor('#000000')
  doc.moveDown(1.5)
}

function writeSummarySection(doc: PDFKit.PDFDocument, summary: AnalyticsSummary): void {
  sectionHeader(doc, 'Summary')
  doc.fontSize(10).font('Helvetica')
  labelValue(doc, 'Total bookings', String(summary.totalBookings))
  labelValue(doc, 'Active', String(summary.activeBookings))
  labelValue(doc, 'Cancelled', String(summary.cancelledBookings))
  labelValue(doc, 'Rescheduled', String(summary.rescheduledBookings))
  doc.moveDown(0.5)
  labelValue(doc, 'Total booked time', `${summary.totalOccupiedMinutes} min`)
  labelValue(doc, 'Average booking', `${summary.averageBookingMinutes} min`)
  labelValue(doc, 'Resources used', String(summary.uniqueResources))
  doc.moveDown(1.2)
}

function writeHeatmapSection(doc: PDFKit.PDFDocument, cells: OccupancyHeatmapCell[], summary: AnalyticsSummary): void {
  sectionHeader(doc, 'Occupancy Heatmap — Top 10 Busiest Hours')
  doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`Period: ${summary.period.dateFrom} – ${summary.period.dateTo}`)
  doc.fillColor('#000000').moveDown(0.4)

  if (cells.length === 0) {
    doc.fontSize(10).text('No bookings in this period.')
    doc.moveDown(1.2)
    return
  }

  const top = cells
    .slice()
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent || b.bookings - a.bookings)
    .slice(0, 10)

  const colWidths = [28, 140, 70, 80, 90, 70]
  const headers = ['#', 'Date', 'Hour', 'Bookings', 'Occupied min', 'Occupancy %']
  tableRow(doc, headers, colWidths, true)

  top.forEach((cell, i) => {
    tableRow(doc, [
      String(i + 1),
      cell.date,
      `${String(cell.hour).padStart(2, '0')}:00`,
      String(cell.bookings),
      String(cell.occupiedMinutes),
      `${cell.occupancyPercent}%`,
    ], colWidths, false)
  })

  doc.moveDown(1.2)
}

function writeUtilizationSection(doc: PDFKit.PDFDocument, resources: ResourceUtilization[], summary: AnalyticsSummary): void {
  sectionHeader(doc, 'Resource Utilization')
  doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`Period: ${summary.period.dateFrom} – ${summary.period.dateTo}`)
  doc.fillColor('#000000').moveDown(0.4)

  if (resources.length === 0) {
    doc.fontSize(10).text('No resources found.')
    doc.moveDown(1.2)
    return
  }

  const sorted = resources.slice().sort((a, b) => b.utilizationPercent - a.utilizationPercent)
  const colWidths = [200, 90, 90, 80]
  const headers = ['Resource', 'Occupied min', 'Available min', 'Utilization %']
  tableRow(doc, headers, colWidths, true)

  for (const r of sorted) {
    tableRow(doc, [r.resourceName, String(r.occupiedMinutes), String(r.availableMinutes), `${r.utilizationPercent}%`], colWidths, false)
  }

  doc.moveDown(1.2)
}

function writePeakHoursSection(doc: PDFKit.PDFDocument, hours: PeakHour[], summary: AnalyticsSummary): void {
  sectionHeader(doc, 'Peak Booking Hours — Top 8')
  doc.fontSize(9).font('Helvetica').fillColor('#555555').text(`Period: ${summary.period.dateFrom} – ${summary.period.dateTo}`)
  doc.fillColor('#000000').moveDown(0.4)

  if (hours.length === 0) {
    doc.fontSize(10).text('No bookings in this period.')
    doc.moveDown(1.2)
    return
  }

  const top = hours.slice(0, 8)
  const colWidths = [28, 70, 80, 90, 80]
  const headers = ['#', 'Hour', 'Bookings', 'Occupied min', 'Occupancy %']
  tableRow(doc, headers, colWidths, true)

  top.forEach((h, i) => {
    tableRow(doc, [
      String(i + 1),
      `${String(h.hour).padStart(2, '0')}:00`,
      String(h.bookings),
      String(h.occupiedMinutes),
      `${h.occupancyPercent}%`,
    ], colWidths, false)
  })

  doc.moveDown(1.2)
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(13).font('Helvetica-Bold').text(title)
  doc.moveDown(0.3)
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const x = doc.page.margins.left
  doc.fontSize(10).font('Helvetica-Bold').text(label + ':', x, doc.y, { continued: true, width: 180 })
  doc.font('Helvetica').text(' ' + value)
}

function tableRow(doc: PDFKit.PDFDocument, cells: string[], widths: number[], isHeader: boolean): void {
  const x = doc.page.margins.left
  const y = doc.y
  const rowHeight = 16

  if (isHeader) {
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), rowHeight).fill('#f0f0f0')
    doc.fillColor('#000000')
  }

  let cx = x
  cells.forEach((cell, i) => {
    doc
      .fontSize(9)
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .text(cell, cx + 3, y + 4, { width: widths[i]! - 6, lineBreak: false })
    cx += widths[i]!
  })

  doc.moveTo(x, y + rowHeight).lineTo(x + widths.reduce((a, b) => a + b, 0), y + rowHeight).stroke('#cccccc')
  doc.y = y + rowHeight + 1
}
