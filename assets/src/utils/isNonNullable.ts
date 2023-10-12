export function isNonNullable<TValue>(
  value: TValue | undefined | null
): value is TValue {
  return value !== null && value !== undefined
}
