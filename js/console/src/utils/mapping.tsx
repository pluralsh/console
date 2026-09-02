export function createMapperWithFallback<T extends string | number | symbol, U>(
  mapper: Record<T, U>,
  fallback: U
) {
  return (k: T | null | undefined) => (k ? mapper[k] || fallback : fallback)
}
