import styled from 'styled-components'
import { DevboxChangeStat } from './devboxChanges'

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const diffStatLabel = ({
  files,
  additions,
  deletions,
}: DevboxChangeStat) =>
  `+${additions} −${deletions} across ${files} ${files === 1 ? 'file' : 'files'}`

// outstanding +/− lines, leaving out a side that's zero
export function DevboxDiffStat({ stat }: { stat: DevboxChangeStat }) {
  if (!stat.files) return null
  return (
    <StatSC aria-label={diffStatLabel(stat)}>
      {!!stat.additions && <AddSC>+{compact.format(stat.additions)}</AddSC>}
      {!!stat.deletions && <DelSC>−{compact.format(stat.deletions)}</DelSC>}
    </StatSC>
  )
}

// a corner block for spots too small for numbers: green for additions, red for deletions, split when both
export function DevboxDiffBlock({ stat }: { stat: DevboxChangeStat }) {
  if (!stat.files) return null
  return (
    <BlockSC
      aria-label={diffStatLabel(stat)}
      $additions={stat.additions > 0}
      $deletions={stat.deletions > 0}
    />
  )
}

const StatSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  fontVariantNumeric: 'tabular-nums',
}))

const AddSC = styled.span(({ theme }) => ({
  color: theme.colors['text-success'],
}))

const DelSC = styled.span(({ theme }) => ({
  color: theme.colors['text-danger'],
}))

const BlockSC = styled.span<{ $additions: boolean; $deletions: boolean }>(
  ({ theme, $additions, $deletions }) => {
    const add = theme.colors['icon-success']
    const del = theme.colors['icon-danger']
    return {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 2,
      background:
        $additions && $deletions
          ? `linear-gradient(90deg, ${add} 50%, ${del} 50%)`
          : $deletions
            ? del
            : $additions
              ? add
              : theme.colors['icon-xlight'],
    }
  }
)
