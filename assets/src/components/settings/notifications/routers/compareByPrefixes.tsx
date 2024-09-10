export function compareByPrefixes(prefixes: string[]) {
  return (a, b) => {
    const prefixIndexA = prefixes.findIndex((prefix) => a.startsWith(prefix))
    const prefixIndexB = prefixes.findIndex((prefix) => b.startsWith(prefix))

    if (prefixIndexA !== -1 && prefixIndexB !== -1) {
      if (prefixIndexA === prefixIndexB) {
        return a.localeCompare(b)
      }

      return prefixIndexA - prefixIndexB
    }
    if (prefixIndexA !== -1) {
      return -1
    }
    if (prefixIndexB !== -1) {
      return 1
    }

    return a.localeCompare(b)
  }
}
