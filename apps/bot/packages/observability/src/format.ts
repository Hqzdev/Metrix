export function escapeLabel(value: string): string {
  // Экранируем значения labels для Prometheus.
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

export function createMetricKey(name: string, labels: Record<string, string>): string {
  // Сортируем labels, чтобы одинаковые наборы давали одинаковый key.
  return `${name}|${Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${escapeKeyPart(key)}=${escapeKeyPart(value)}`).join('|')}`
}

export function renderLabels(labels: Record<string, string>): string {
  // Превращает объект labels в prometheus label string.
  return Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',')
}

export function escapeKeyPart(value: string): string {
  // encodeURIComponent безопасно прячет separators.
  return encodeURIComponent(value)
}

export function unescapeKeyPart(value: string): string {
  // Обратная операция для parseHttpKey.
  return decodeURIComponent(value)
}
