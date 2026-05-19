import { readFile } from 'node:fs/promises'

const specPath = process.argv[2] ?? 'docs/openapi/metrix-bot-api.yaml'
const source = await readFile(specPath, 'utf8')

const requiredTopLevelSections = [
  'openapi:',
  'info:',
  'servers:',
  'paths:',
  'components:',
]

const requiredPaths = [
  '/health:',
  '/ready:',
  '/metrics:',
  '/bookings:',
  '/invoices:',
  '/reports:',
  '/audit-logs:',
  '/dlq:',
  '/dlq/replay:',
]

const requiredSecurity = [
  'serviceHmac:',
  'X-Signature',
]

const errors = [
  ...missing('top-level section', requiredTopLevelSections),
  ...missing('path', requiredPaths),
  ...missing('security marker', requiredSecurity),
]

if (!source.includes('openapi: 3.1.0')) {
  errors.push('expected OpenAPI version 3.1.0')
}

if (errors.length > 0) {
  console.error(`OpenAPI validation failed for ${specPath}`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`OpenAPI validation passed for ${specPath}`)

function missing(kind, markers) {
  return markers
    .filter((marker) => !source.includes(marker))
    .map((marker) => `missing ${kind}: ${marker}`)
}
