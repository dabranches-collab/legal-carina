import { useEffect, useRef, type PointerEvent } from 'react'

type Props = {
  label: string
  width: number
  onWidthChange: (width: number) => void
  onAutoFit?: () => void
}

const minimumWidth = 88

export function ColumnResizeHandle({ label, width, onWidthChange, onAutoFit }: Props) {
  const stopResize = useRef<(() => void) | null>(null)
  useEffect(() => () => stopResize.current?.(), [])

  const startResize = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.preventDefault()
    event.stopPropagation()
    stopResize.current?.()
    const startX = event.clientX
    const initialWidth = width
    const pointerId = event.pointerId
    const owner = event.currentTarget.ownerDocument
    const move = (next: globalThis.PointerEvent) => {
      if (next.pointerId === pointerId) onWidthChange(Math.max(minimumWidth, initialWidth + next.clientX - startX))
    }
    const stop = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return
      owner.removeEventListener('pointermove', move)
      owner.removeEventListener('pointerup', stop)
      owner.removeEventListener('pointercancel', stop)
      stopResize.current = null
    }
    owner.addEventListener('pointermove', move)
    owner.addEventListener('pointerup', stop)
    owner.addEventListener('pointercancel', stop)
    stopResize.current = () => {
      owner.removeEventListener('pointermove', move)
      owner.removeEventListener('pointerup', stop)
      owner.removeEventListener('pointercancel', stop)
    }
  }

  return <span
    role="separator"
    tabIndex={0}
    aria-orientation="vertical"
    aria-label={`Ajustar largura de ${label}`}
    aria-valuemin={minimumWidth}
    aria-valuenow={width}
    aria-valuetext={`${width} píxeis`}
    title={`Arraste para ajustar ${label}. Use ← ou → no teclado.${onAutoFit ? ' Duplo clique para ajustar ao conteúdo.' : ''}`}
    onPointerDown={startResize}
    onDoubleClick={event => { event.preventDefault(); event.stopPropagation(); onAutoFit?.() }}
    onKeyDown={event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      event.stopPropagation()
      onWidthChange(Math.max(minimumWidth, width + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 25 : 10)))
    }}
    className="group absolute inset-y-0 -right-1 z-10 flex w-4 cursor-col-resize items-center justify-center outline-none touch-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-secondary"
  ><span aria-hidden="true" className="h-7 w-0.5 rounded-full bg-border-strong transition-colors group-hover:bg-secondary group-focus-visible:bg-secondary" /></span>
}
