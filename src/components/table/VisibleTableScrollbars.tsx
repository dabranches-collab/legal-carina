import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Position = { left: number; top: number; width: number }

function TableScrollbar({ scroller, table }: { scroller: HTMLElement; table: HTMLTableElement }) {
  const [position, setPosition] = useState<Position | null>(null)
  const [offset, setOffset] = useState(0)
  const [maximum, setMaximum] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; offset: number } | null>(null)
  const controls = useId()
  useEffect(() => {
    const previousId = scroller.id
    const previousPadding = scroller.style.paddingBottom
    const basePadding = Number.parseFloat(getComputedStyle(scroller).paddingBottom) || 0
    if (!previousId) scroller.id = controls
    let frame = 0
    const update = () => {
      frame = 0
      const rect = scroller.getBoundingClientRect(), tableRect = table.getBoundingClientRect()
      const viewport = window.visualViewport
      const safeBottom = track.current?.querySelector<HTMLElement>('[data-safe-inset]')?.getBoundingClientRect().height ?? 0
      let top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight) - 24 - safeBottom
      let left = Math.max(rect.left, viewport?.offsetLeft ?? 0)
      let right = Math.min(rect.right, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth))
      for (let parent = scroller.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect()
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom - 24) }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right) }
      }
      const max = scroller.scrollWidth - scroller.clientWidth
      scroller.classList.toggle('visible-table-scroll-source', max > 1 && scroller.scrollHeight <= scroller.clientHeight + 1)
      // Leave room for the bar before the table's footer or pagination.
      scroller.style.paddingBottom = max > 1 ? `${basePadding + 24}px` : previousPadding
      const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].at(-1)
      const y = Math.min(tableRect.bottom, bottom)
      const visible = max > 1 && right - left > 48 && y > Math.max(top, tableRect.top + 40) && (!dialog || dialog.contains(table))
      setMaximum(max); setOffset(scroller.scrollLeft)
      setPosition(visible ? { left, top: y, width: right - left } : null)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(scroller); observer?.observe(table)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    window.addEventListener('table-scrollbars-update', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    update()
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect()
      if (!previousId && scroller.id === controls) scroller.removeAttribute('id')
      scroller.style.paddingBottom = previousPadding
      scroller.classList.remove('visible-table-scroll-source')
      window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule)
      window.removeEventListener('table-scrollbars-update', schedule)
      window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule)
    }
  }, [scroller, table, controls])
  if (!position) return null
  const thumbWidth = Math.min(position.width, Math.max(36, position.width * scroller.clientWidth / scroller.scrollWidth))
  const travel = position.width - thumbWidth
  const move = (next: number) => { scroller.scrollLeft = Math.max(0, Math.min(maximum, next)); setOffset(scroller.scrollLeft) }
  const label = table.getAttribute('aria-label') ?? table.closest('section')?.getAttribute('aria-label') ?? table.caption?.textContent ?? 'Tabela'
  const zoom = (Number.parseFloat(getComputedStyle(document.body).zoom) || 1) * (Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1)
  return createPortal(<div ref={track} role="scrollbar" tabIndex={0} aria-controls={scroller.id || controls} aria-label={`Deslocação horizontal · ${label}`} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.round(maximum)} aria-valuenow={Math.round(offset)}
    className="visible-table-scrollbar fixed z-[100] h-6 touch-none rounded border border-border bg-surface shadow-raised"
    style={{ left: position.left / zoom, top: position.top / zoom, width: position.width / zoom, height: 24 / zoom }}
    onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? offset + 64 : event.key === 'ArrowLeft' ? offset - 64 : event.key === 'Home' ? 0 : event.key === 'End' ? maximum : event.key === 'PageDown' ? offset + scroller.clientWidth : event.key === 'PageUp' ? offset - scroller.clientWidth : null
      if (next !== null) { event.preventDefault(); move(next) }
    }}
    onPointerDown={event => {
      event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId)
      if (!(event.target as HTMLElement).hasAttribute('data-scroll-thumb')) move((event.clientX - position.left - thumbWidth / 2) / travel * maximum)
      drag.current = { x: event.clientX, offset: scroller.scrollLeft }
    }}
    onPointerMove={event => { if (drag.current && travel > 0) move(drag.current.offset + (event.clientX - drag.current.x) / travel * maximum) }}
    onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}>
    <div data-scroll-thumb className="absolute rounded bg-secondary" style={{ top: 4 / zoom, bottom: 4 / zoom, width: thumbWidth / zoom, left: maximum > 0 ? offset / maximum * travel / zoom : 0 }} />
    <span data-safe-inset aria-hidden="true" className="pointer-events-none absolute invisible" style={{ height: 'env(safe-area-inset-bottom)' }} />
  </div>, document.body)
}

/** Covers standard lists and the smaller tables inside client records. */
export function VisibleTableScrollbars() {
  const [tables, setTables] = useState<Array<{ table: HTMLTableElement; scroller: HTMLElement }>>([])
  useEffect(() => {
    const scan = () => {
      const found: Array<{ table: HTMLTableElement; scroller: HTMLElement }> = []
      for (const table of document.querySelectorAll('table')) {
        for (let parent = table.parentElement; parent; parent = parent.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(parent).overflowX)) { found.push({ table, scroller: parent }); break }
        }
      }
      setTables(current => current.length === found.length && current.every((item, index) => item.table === found[index].table && item.scroller === found[index].scroller) ? current : found)
      window.dispatchEvent(new Event('table-scrollbars-update'))
    }
    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('table,[role="dialog"]') || node.querySelector('table,[role="dialog"]'))))) scan()
    })
    observer.observe(document.body, { childList: true, subtree: true }); scan()
    return () => observer.disconnect()
  }, [])
  return <>{tables.map(({ table, scroller }, index) => <TableScrollbar key={index} table={table} scroller={scroller} />)}</>
}
