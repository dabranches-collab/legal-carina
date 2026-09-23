/** Limites disponíveis para painéis fixos, incluindo os recortes do iOS. */
export function safeViewportBounds(margin = 8) {
  const root = getComputedStyle(document.documentElement)
  const inset = (name: string) => Number.parseFloat(root.getPropertyValue(name)) || 0
  const viewport = window.visualViewport
  const visualTop = viewport?.offsetTop ?? 0
  const visualLeft = viewport?.offsetLeft ?? 0
  const visualRight = visualLeft + (viewport?.width ?? window.innerWidth)
  const visualBottom = visualTop + (viewport?.height ?? window.innerHeight)
  return {
    left: Math.max(inset('--safe-left'), visualLeft) + margin,
    right: Math.min(window.innerWidth - inset('--safe-right'), visualRight) - margin,
    top: Math.max(inset('--safe-top'), visualTop) + margin,
    bottom: Math.min(window.innerHeight - inset('--safe-bottom'), visualBottom) - margin,
  }
}
