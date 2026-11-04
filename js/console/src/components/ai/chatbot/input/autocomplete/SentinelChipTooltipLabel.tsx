import styled from 'styled-components'
import { ChipAttrsByKind, MentionKind } from './mentionTypes'

type SentinelChipKind = MentionKind.SentinelRun | MentionKind.SentinelRunJob

type SentinelTooltipAttrs = Partial<
  Omit<ChipAttrsByKind[MentionKind.SentinelRun], 'kind'> &
    Omit<ChipAttrsByKind[MentionKind.SentinelRunJob], 'kind'>
>

type TooltipRow = { label: string; value: string; mono?: boolean }

function tooltipRows(
  kind: SentinelChipKind,
  attrs: SentinelTooltipAttrs
): TooltipRow[] {
  const rows: Array<TooltipRow | null> =
    kind === MentionKind.SentinelRun
      ? [
          row('Sentinel', attrs['sentinel-name']),
          row('Status', attrs.status),
          row('Checks', attrs.results, true),
          row('Errors', attrs.errors, true),
        ]
      : [
          row('Sentinel', attrs['sentinel-name']),
          row('Check', attrs.check),
          row('Cluster', attrs['cluster-handle']),
          row('Status', attrs.status),
          row('Error', attrs.error, true),
          row('Output', attrs.output, true),
        ]

  return rows.filter((r): r is TooltipRow => !!r)
}

function row(
  label: string,
  value: Nullable<string>,
  mono = false
): TooltipRow | null {
  const trimmed = value?.trim()
  return trimmed ? { label, value: trimmed, mono } : null
}

export function sentinelChipTooltipText(
  kind: SentinelChipKind,
  attrs: SentinelTooltipAttrs
): string {
  return tooltipRows(kind, attrs)
    .map(({ label, value }) => `${label}: ${value}`)
    .join('\n')
}

export function SentinelChipTooltipLabel({
  kind,
  attrs,
}: {
  kind: SentinelChipKind
  attrs: SentinelTooltipAttrs
}) {
  const rows = tooltipRows(kind, attrs)
  if (!rows.length) return null

  return (
    <WrapSC>
      {rows.map(({ label, value, mono }) => (
        <RowSC key={label}>
          <LabelSC>{label}</LabelSC>
          <ValueSC $mono={mono}>{value}</ValueSC>
        </RowSC>
      ))}
    </WrapSC>
  )
}

const WrapSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const RowSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
})

const LabelSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const ValueSC = styled.div<{ $mono?: boolean }>(({ theme, $mono }) => ({
  ...($mono ? theme.partials.text.code : theme.partials.text.body2),
  ...($mono && { fontSize: 12 }),
  color: theme.colors.text,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 6,
  overflow: 'hidden',
}))
