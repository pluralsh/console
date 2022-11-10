export function* reverse(array, mapper = i => i) {
  for (let i = array.length - 1; i >= 0; i--) {
    yield mapper(array[i])
  }
}

export function* lookahead(array, mapper = i => i) {
  const len = array.length

  for (let i = 0; i < len; i++) {
    yield mapper(array[i], array[i + 1] || {})
  }
}

export function* chunk(array, chunkSize) {
  let i; let
    j

  for (i = 0, j = array.length; i < j; i += chunkSize) {
    yield array.slice(i, i + chunkSize)
  }
}

export function groupBy(list, key = i => i.id) {
  const grouped = {}

  for (const item of list) {
    const k = key(item)
    const group = grouped[k] || []

    group.push(item)
    grouped[k] = group
  }

  return grouped
}

export function trimSuffix(str, suff) {
  if (str.endsWith(suff)) {
    return str.slice(0, str.length - suff.length)
  }

  return str
}
