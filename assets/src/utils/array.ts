export function* reverse<T>(array: T[], mapper: (val: T) => T = (i) => i) {
  for (let i = array.length - 1; i >= 0; i--) {
    yield mapper(array[i])
  }
}

export function* chunk<T>(array: T[], chunkSize: number) {
  let i
  const len = array.length

  for (i = 0; i < len; i += chunkSize) {
    yield array.slice(i, i + chunkSize)
  }
}

export function* pairwise<T>(iterable: Iterable<T>): Generator<[T, T], void> {
  const iterator = iterable[Symbol.iterator]()
  let a = iterator.next()

  if (a.done) return
  let b = iterator.next()

  while (!b.done) {
    yield [a.value, b.value]
    a = b
    b = iterator.next()
  }
}

export function trimSuffix(str: string, suff: string) {
  if (str.endsWith(suff)) {
    return str.slice(0, str.length - suff.length)
  }

  return str
}
