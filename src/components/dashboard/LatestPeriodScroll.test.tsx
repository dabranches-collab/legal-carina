import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LatestPeriodScroll } from "./LatestPeriodScroll";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("abre no último período, acompanha o resize e conserva a consulta manual", () => {
  let width = 320;
  const resizeCallbacks: (() => void)[] = [];
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(672);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resizeCallbacks.push(callback); }
    observe() {}
    disconnect = disconnect;
  });
  const { container, rerender, unmount } = render(<LatestPeriodScroll><div>Jan — Dez</div></LatestPeriodScroll>);
  const scroll = container.firstElementChild as HTMLDivElement;
  expect(scroll.scrollLeft).toBe(352);
  width = 390;
  act(() => resizeCallbacks.at(-1)!());
  expect(scroll.scrollLeft).toBe(282);
  fireEvent.pointerDown(scroll);
  scroll.scrollLeft = 40;
  rerender(<LatestPeriodScroll><div>Valores actualizados</div></LatestPeriodScroll>);
  expect(scroll.scrollLeft).toBe(40);
  width = 360;
  act(() => resizeCallbacks.at(-1)!());
  expect(scroll.scrollLeft).toBe(40);
  unmount();
  expect(disconnect).toHaveBeenCalled();
});

it("fica sem deslocação quando o gráfico cabe e abre no fim ao estreitar", () => {
  let width = 1000;
  let resize = () => {};
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(672);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() {}
  });
  const { container } = render(<LatestPeriodScroll><div>Jan — Dez</div></LatestPeriodScroll>);
  const scroll = container.firstElementChild as HTMLDivElement;
  expect(scroll.scrollLeft).toBe(0);
  width = 320;
  act(() => resize());
  expect(scroll.scrollLeft).toBe(352);
});
