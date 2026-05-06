import {
  ClusterIcon,
  DeploymentIcon,
  StackIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { MentionItem } from './mentionTypes'

function iconForItem(item: MentionItem): ReactNode {
  switch (item.kind) {
    case 'cluster':
      return <ClusterIcon size={14} />
    case 'service':
      return <DeploymentIcon size={14} />
    case 'stack':
      return <StackIcon size={14} />
    case 'skill':
      return <WorkbenchIcon size={14} />
  }
}

function subtitleForItem(item: MentionItem): string | undefined {
  switch (item.kind) {
    case 'cluster':
      return item.handle ?? item.provider?.cloud ?? undefined
    case 'service':
      return item.cluster?.name ?? item.namespace ?? undefined
    case 'stack':
      return item.type ?? undefined
    case 'skill':
      return item.description ?? undefined
  }
}

export function MentionResults({
  items,
  highlightedIndex,
  loading,
  onSelect,
  onHover,
}: {
  items: MentionItem[]
  highlightedIndex: number
  loading: boolean
  onSelect: (item: MentionItem) => void
  onHover: (index: number) => void
}) {
  const theme = useTheme()
  if (loading && items.length === 0) {
    return <EmptyStateSC>Loading…</EmptyStateSC>
  }
  if (items.length === 0) {
    return <EmptyStateSC>No matches</EmptyStateSC>
  }
  return (
    <ResultsListSC role="listbox">
      {items.map((item, idx) => (
        <ResultRowSC
          key={`${item.kind}:${item.id}`}
          role="option"
          aria-selected={idx === highlightedIndex}
          $highlighted={idx === highlightedIndex}
          onMouseEnter={() => onHover(idx)}
          // mousedown to fire before the editor loses focus
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(item)
          }}
        >
          <span css={{ color: theme.colors['icon-light'] }}>
            {iconForItem(item)}
          </span>
          <RowTextSC>
            <RowTitleSC>{item.name ?? ''}</RowTitleSC>
            {subtitleForItem(item) && (
              <RowSubtitleSC>{subtitleForItem(item)}</RowSubtitleSC>
            )}
          </RowTextSC>
          <RowKindSC>{item.kind}</RowKindSC>
        </ResultRowSC>
      ))}
    </ResultsListSC>
  )
}

const ResultsListSC = styled.ul(({ theme }) => ({
  listStyle: 'none',
  padding: theme.spacing.xxsmall,
  margin: 0,
  maxHeight: 280,
  overflowY: 'auto',
}))

const ResultRowSC = styled.li<{ $highlighted: boolean }>(
  ({ theme, $highlighted }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
    borderRadius: theme.borderRadiuses.medium,
    cursor: 'pointer',
    background: $highlighted ? theme.colors['fill-two'] : 'transparent',
  })
)

const RowTextSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const RowTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const RowSubtitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const RowKindSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  textTransform: 'uppercase',
  letterSpacing: 0.4,
}))

const EmptyStateSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  textAlign: 'center',
}))
