import { describe, expect, it, vi } from "vitest";
import { isTransientNetworkError, withTransientRetry } from "./transientRetry";

describe("repetição de pedidos transitórios", () => {
  it("repete Failed to fetch e devolve o primeiro resultado válido", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "TypeError: Failed to fetch" } })
      .mockResolvedValueOnce({ data: [{ id: "1" }], error: null });
    const pending = withTransientRetry(operation);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ data: [{ id: "1" }], error: null });
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("não repete erros funcionais do Supabase", async () => {
    const operation = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(withTransientRetry(operation)).resolves.toEqual({
      data: null,
      error: { message: "permission denied" },
    });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(isTransientNetworkError({ message: "Network request failed" })).toBe(true);
  });
});
