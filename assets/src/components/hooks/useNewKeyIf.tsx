export function useNewKeyIf(condition: boolean) {
  const key = useRef(Number.MIN_SAFE_INTEGER)

  if (condition) {
    key.current =
      key.current < Number.MAX_SAFE_INTEGER
        ? key.current + 1
        : Number.MIN_SAFE_INTEGER
  }

  return key.current
}
