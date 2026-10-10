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
  const followLatest = useRef(true);
  const manualOffset = useRef(0);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const alignLatest = () => {
      const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
      // A render can precede the scroll event; only infer intent at unchanged width.
      if (userInteracted.current && maximum === previousMaximum.current) {
        const expected = followLatest.current ? maximum : Math.min(manualOffset.current, maximum);
        if (Math.abs(element.scrollLeft - expected) > 1) {
          followLatest.current = element.scrollLeft >= maximum - 1;
          manualOffset.current = element.scrollLeft;
        }
      }
      element.scrollLeft = followLatest.current
        ? maximum
        : Math.min(manualOffset.current, maximum);
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
      onScroll={(event) => {
        if (!userInteracted.current) return;
        const element = event.currentTarget;
        const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
        // A resize clamp is not a new choice of period.
        if (maximum !== previousMaximum.current) return;
        const expected = followLatest.current ? maximum : Math.min(manualOffset.current, maximum);
        if (Math.abs(element.scrollLeft - expected) <= 1) return;
        followLatest.current = element.scrollLeft >= maximum - 1;
        manualOffset.current = element.scrollLeft;
      }}
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
