import { useEffect, useState } from 'react'
import { ColumnResizeHandle } from './ColumnResizeHandle'

export function useResizablePlainTable(id: string, defaults: readonly number[]) {
  const key = `carina.plain-table.${id}.widths`
  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]')
      return defaults.map((initial, index) => typeof stored[index] === 'number' && Number.isFinite(stored[index]) ? Math.max(88, stored[index]) : initial)
    } catch { return [...defaults] }
  })
  useEffect(() => {
    setWidths(current => current.length === defaults.length ? current : defaults.map((initial, index) => current[index] ?? initial))
  }, [defaults])
  useEffect(() => { localStorage.setItem(key, JSON.stringify(widths)) }, [key, widths])
  const width = widths.reduce((sum, value) => sum + value, 0)
  const colgroup = <colgroup>{widths.map((value, index) => <col key={index} style={{ width: value }} />)}</colgroup>
  const header = (index: number, label: string, className = 'p-2 text-left') => <th key={index} scope="col" style={{ width: widths[index] }} className={`relative ${className}`}>
    {label}
    <ColumnResizeHandle label={label} width={widths[index]} onWidthChange={next => setWidths(current => current.map((value, position) => position === index ? next : value))} onAutoFit={() => setWidths(current => current.map((value, position) => position === index ? defaults[index] : value))} />
  </th>
  return { width, colgroup, header }
}
