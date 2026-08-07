import {
  AzureDevopsLogoIcon,
  BitBucketIcon,
  GitHubLogoIcon,
  GitLabLogoIcon,
} from '@pluralsh/design-system'
import {
  ClusterIcon,
  GitPullIcon,
  StackIcon,
  WarningShieldIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { ReactNode, useEffect, useRef } from 'react'
import styled, { useTheme } from 'styled-components'
import { stackTypeLabel } from 'components/stacks/common/stackTypeUtils'
import { ScmType, StackType } from 'generated/graphql'
import { ChipAttrs, KIND_LABELS, MentionKind } from './mentionTypes'
import { isEmpty } from 'lodash'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'

const itemToIcon: Record<MentionKind, ReactNode> = {
  [MentionKind.Cluster]: <ClusterIcon size={14} />,
  [MentionKind.Service]: <GitPullIcon size={14} />,
  [MentionKind.Stack]: <StackIcon size={14} />,
  [MentionKind.Skill]: <WorkbenchIcon size={14} />,
  [MentionKind.Vulnerability]: <WarningShieldIcon size={14} />,
  [MentionKind.Repository]: <GitPullIcon size={14} />,
}

function repositoryIcon(provider?: string): ReactNode {
  switch (provider) {
    case ScmType.Github:
      return (
        <GitHubLogoIcon
          size={14}
          fullColor
        />
      )
    case ScmType.Gitlab:
      return (
        <GitLabLogoIcon
          size={14}
          fullColor
        />
      )
    case ScmType.Bitbucket:
      return (
        <BitBucketIcon
          size={14}
          fullColor
        />
      )
    case ScmType.AzureDevops:
      return (
        <AzureDevopsLogoIcon
          size={14}
          fullColor
        />
      )
    default:
      return itemToIcon[MentionKind.Repository]
  }
}

function subtitleForItem(item: ChipAttrs) {
  switch (item.kind) {
    case MentionKind.Cluster:
      return item.handle ?? item.provider
    case MentionKind.Service:
      return item['cluster-handle'] ?? item['cluster-name'] ?? item.namespace
    case MentionKind.Stack:
      return item.type ? stackTypeLabel(item.type as StackType) : undefined
    case MentionKind.Skill:
      return item.description
    case MentionKind.Vulnerability:
      return item.resource ?? item['vuln-id'] ?? undefined
    case MentionKind.Repository:
      return item['repo-slug'] ? item['repo-url'] : undefined
  }
}

export function MentionResults({
  items,
  highlightedIndex,
  loading,
  onSelect,
  onHover,
}: {
  items: ChipAttrs[]
  highlightedIndex: number
  loading: boolean
  onSelect: (item: ChipAttrs) => void
  onHover: (index: number) => void
}) {
  const theme = useTheme()
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const row = listRef.current?.children[highlightedIndex] as
      HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  if (isEmpty(items))
    return (
      <EmptyStateSC>
        {loading ? (
          <RectangleSkeleton
            $width="100%"
            $height="xlarge"
          />
        ) : (
          'No matches'
        )}
      </EmptyStateSC>
    )
  return (
    <ResultsListSC
      ref={listRef}
      role="listbox"
    >
      {items.map((item, idx) => {
        const subtitle = subtitleForItem(item)
        return (
          <ResultRowSC
            key={`${item.kind}:${item['item-id']}`}
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
              {item.kind === MentionKind.Repository
                ? repositoryIcon(item.provider)
                : itemToIcon[item.kind]}
            </span>
            <RowTextSC>
              <RowTitleSC>{item['item-name']}</RowTitleSC>
              {subtitle && <RowSubtitleSC>{subtitle}</RowSubtitleSC>}
            </RowTextSC>
            <RowKindSC>{KIND_LABELS[item.kind]}</RowKindSC>
          </ResultRowSC>
        )
      })}
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
