import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Start chronological charts at the latest period, without undoing manual scroll. */
export function LatestPeriodScroll({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const previousMaximum = useRef<number | null>(null);
  const userInteracted = useRef(false);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const alignLatest = () => {
      const previous = previousMaximum.current;
      const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
      if (!userInteracted.current || previous === null || element.scrollLeft >= previous - 1) {
        element.scrollLeft = maximum;
      }
      previousMaximum.current = maximum;
    };
    alignLatest();
    let active = true;
    void document.fonts?.ready.then(() => { if (active) alignLatest(); });
    if (typeof ResizeObserver === "undefined") return () => { active = false; };
    const observer = new ResizeObserver(alignLatest);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => { active = false; observer.disconnect(); };
  }, [children]);

  return (
    <div
      ref={scroller}
      data-chart-period-scroll
      onPointerDown={() => { userInteracted.current = true; }}
      onTouchStart={() => { userInteracted.current = true; }}
      onWheel={() => { userInteracted.current = true; }}
      onKeyDown={() => { userInteracted.current = true; }}
      className={`overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
}
