export type TraceBarColor = {
  accent: string
  fill: string
  text: string
}

export const TRACE_BAR_COLORS: TraceBarColor[] = [
  { accent: '#3CECAF', fill: '#0A6B4A', text: '#F1FEF9' },
  { accent: '#F6AD55', fill: '#9C4221', text: '#FFFAF0' },
  { accent: '#33B4FF', fill: '#004166', text: '#F0F9FF' },
  { accent: '#E95374', fill: '#660A19', text: '#FFF0F2' },
  { accent: '#B794F4', fill: '#553C9A', text: '#F1F1FE' },
]

export function traceBarColor(service: string): TraceBarColor {
  const hash = [...service].reduce(
    (value, char) => value + char.charCodeAt(0),
    0
  )

  return TRACE_BAR_COLORS[hash % TRACE_BAR_COLORS.length]
}
