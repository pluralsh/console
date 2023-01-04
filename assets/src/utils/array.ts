export function* reverse<T>(array: T[], mapper: (val: T) => T = i => i) {
  for (let i = array.length - 1; i >= 0; i--) {
    yield mapper(array[i])
  }
}

export function* lookahead<T extends object, R>(array: T[],
  mapper: (val: T, nextVal: T) => R) {
  const len = array.length

  for (let i = 0; i < len; i++) {
    yield mapper(array[i], array[i + 1] || {})
  }
}

export function* chunk<T>(array: T[], chunkSize: number) {
  let i
  const len = array.length

  for (i = 0; i < len; i += chunkSize) {
    yield array.slice(i, i + chunkSize)
  }
}

export function groupBy<T extends { id?: any }>(list: Iterable<T>,
  key: (val: T) => string = (i: T) => i.id) {
  const grouped: Record<string, T[]> = {}

  for (const item of list) {
    const k = key(item)
    const group = grouped[k] || []

    group.push(item)
    grouped[k] = group
  }

  return grouped
}

export function trimSuffix(str: string, suff: string) {
  if (str.endsWith(suff)) {
    return str.slice(0, str.length - suff.length)
  }

  return str
}
