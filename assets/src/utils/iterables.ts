export function isEmptyIterable(iterable) {
  // eslint-disable-next-line no-unreachable-loop
  for (const _ of iterable) {
    return false
  }

  return true
}
