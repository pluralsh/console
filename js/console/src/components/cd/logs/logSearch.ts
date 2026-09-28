type MatchRange = { start: number; end: number }

export function isLogSearchActive(query?: string): boolean {
  const normalized = query?.trim()
  return !!normalized && normalized !== '*'
}

export function getLogSearchTerms(query?: string): string[] {
  const normalized = query?.trim()
  if (!normalized || normalized === '*') return []

  const quoted = normalized.match(/^(['"])(.*)\1$/)
  if (quoted?.[2]) return [quoted[2]]

  return normalized.split(/\s+/).filter(Boolean)
}

export function logMatchesSearch(
  log: string | null | undefined,
  query: string | undefined,
  operator?: string
): boolean {
  const terms = getLogSearchTerms(query)
  if (!terms.length) return true

  const normalizedLog = (log ?? '').toLowerCase()
  const matchesTerm = (term: string) =>
    normalizedLog.includes(term.toLowerCase())

  return operator === 'AND' ? terms.every(matchesTerm) : terms.some(matchesTerm)
}

export function getLogSearchMatchRanges(
  text: string,
  query?: string
): MatchRange[] {
  const terms = getLogSearchTerms(query)
  if (!terms.length) return []

  const normalizedText = text.toLowerCase()
  const ranges = terms
    .sort((a, b) => b.length - a.length)
    .flatMap((term) => findRanges(normalizedText, term.toLowerCase()))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const nonOverlapping: MatchRange[] = []
  let lastEnd = -1

  ranges.forEach((range) => {
    if (range.start >= lastEnd) {
      nonOverlapping.push(range)
      lastEnd = range.end
    }
  })

  return nonOverlapping
}

function findRanges(text: string, term: string): MatchRange[] {
  if (!term) return []

  const ranges: MatchRange[] = []
  let start = text.indexOf(term)

  while (start !== -1) {
    ranges.push({ start, end: start + term.length })
    start = text.indexOf(term, start + term.length)
  }

  return ranges
}
