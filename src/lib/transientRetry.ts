type RequestResult = { error?: { message?: string } | null };

export function isTransientNetworkError(error: RequestResult["error"] | unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  return /failed to fetch|fetch failed|network(?:error| request failed)|load failed/i.test(
    message,
  );
}

export async function withTransientRetry<T extends RequestResult>(
  operation: () => PromiseLike<T>,
  attempts = 3,
): Promise<T> {
  let lastThrown: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await operation();
      if (!result.error || !isTransientNetworkError(result.error) || attempt === attempts - 1)
        return result;
    } catch (error) {
      lastThrown = error;
      if (!isTransientNetworkError(error) || attempt === attempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  throw lastThrown;
}
