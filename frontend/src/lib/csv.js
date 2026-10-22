export function toCsv(rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))
  return [head, ...body].join('\r\n')
}

export function downloadCsv(name, rows, columns) {
  const blob = new Blob(['\ufeff' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
