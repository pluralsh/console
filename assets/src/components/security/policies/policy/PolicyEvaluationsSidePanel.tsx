import { CheckIcon, Chip, CloseIcon, Flex } from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import type { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import { VirtualList } from 'components/utils/VirtualList'
import { PolicyEvaluationFragment, PolicyType } from 'generated/graphql'
import { partition } from 'lodash'
import { type ComponentProps, useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import {
  getPolicyEvalDecision,
  getPolicyEvalToolName,
  isBindingPolicyEval,
  PolicyEvalDecision,
  PolicyEvalDecisionFilter,
  PolicyEvalMap,
} from './policyEval'

type EvalFilter = 'all' | PolicyEvalDecisionFilter
type ChipSeverity = NonNullable<ComponentProps<typeof Chip>['severity']>
type AnnotatedEval = {
  evaluation: PolicyEvaluationFragment
  decision: PolicyEvalDecision
}

const FILTER_LABELS: Record<EvalFilter, string> = {
  all: 'All',
  deny: 'Deny',
  allow: 'Allow',
  match: 'Match',
  'no-match': 'No match',
}

export function PolicyEvaluationsSidePanel({
  evals,
  policyType,
  loading,
  isLoadingNextPage,
  hasNextPage,
  fetchNextPage,
  onVirtualSliceChange,
  selectedEvalId,
  onSelectEvalId,
}: {
  evals: PolicyEvaluationFragment[]
  policyType?: PolicyType | null
  loading: boolean
  isLoadingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  onVirtualSliceChange: (slice: VirtualSlice) => void
  selectedEvalId?: string | null
  onSelectEvalId: (evalId: string) => void
}) {
  const theme = useTheme()
  const [activeFilter, setActiveFilter] = useState<EvalFilter>('all')
  const binding = isBindingPolicyEval(undefined, policyType)
  const negativeKey: PolicyEvalDecisionFilter = binding ? 'no-match' : 'deny'
  const positiveKey: PolicyEvalDecisionFilter = binding ? 'match' : 'allow'

  const annotatedEvals = useMemo<AnnotatedEval[]>(
    () =>
      evals.map((evaluation) => ({
        evaluation,
        decision: getPolicyEvalDecision(
          evaluation.output as PolicyEvalMap,
          policyType
        ),
      })),
    [evals, policyType]
  )

  const { filteredEvals, filterOptions } = useMemo(() => {
    const [negative, positive] = partition(
      annotatedEvals,
      ({ decision }) => decision.filterKey === negativeKey
    )

    return {
      filteredEvals:
        activeFilter === 'all'
          ? annotatedEvals
          : activeFilter === negativeKey
            ? negative
            : positive,
      filterOptions: [
        {
          key: 'all' as const,
          count: annotatedEvals.length,
          severity: 'neutral' as ChipSeverity,
        },
        {
          key: negativeKey,
          count: negative.length,
          severity: (binding ? 'neutral' : 'danger') as ChipSeverity,
        },
        {
          key: positiveKey,
          count: positive.length,
          severity: 'success' as ChipSeverity,
        },
      ],
    }
  }, [activeFilter, annotatedEvals, binding, negativeKey, positiveKey])

  useEffect(() => {
    setActiveFilter('all')
  }, [binding])

  useEffect(() => {
    if (isLoadingNextPage || !hasNextPage) return
    if (activeFilter === 'all' || filteredEvals.length > 0) return

    fetchNextPage()
  }, [
    activeFilter,
    fetchNextPage,
    filteredEvals.length,
    hasNextPage,
    isLoadingNextPage,
  ])

  return (
    <Flex
      direction="column"
      minHeight={0}
      overflow="hidden"
      height="100%"
      css={{
        borderRight: theme.borders.default,
        minWidth: 350,
        maxWidth: 350,
      }}
    >
      <Flex
        alignItems="center"
        gap="xsmall"
        padding="medium"
        wrap="wrap"
        css={{ borderBottom: theme.borders.default }}
      >
        {filterOptions.map(({ key, count, severity }) => (
          <EvalFilterChip
            key={key}
            filterKey={key}
            active={activeFilter === key}
            count={count}
            severity={severity}
            disabled={count === 0 && !hasNextPage}
            onClick={() => setActiveFilter(key)}
          />
        ))}
      </Flex>
      <Flex
        flex={1}
        minHeight={0}
      >
        {loading || filteredEvals.length ? (
          <VirtualList
            data={filteredEvals}
            loading={loading}
            itemGap="xsmall"
            skeletonProps={{ gap: 'xsmall', height: 52, numRows: 3 }}
            hasNextPage={hasNextPage}
            isLoadingNextPage={isLoadingNextPage}
            loadNextPage={() => hasNextPage && fetchNextPage()}
            onVirtualSliceChange={onVirtualSliceChange}
            getRowId={({ evaluation }) => evaluation.id}
            style={{ height: '100%' }}
            renderer={({ rowData: { evaluation, decision } }) => (
              <EvalLinkSC
                $active={selectedEvalId === evaluation.id}
                onClick={() => onSelectEvalId(evaluation.id)}
              >
                <DecisionBadge decision={decision} />
                <Flex
                  direction="column"
                  gap="xxsmall"
                  minWidth={0}
                >
                  <span
                    css={{
                      ...theme.partials.text.body2LooseLineHeight,
                      color: theme.colors['text-light'],
                      ...TRUNCATE,
                    }}
                  >
                    {getPolicyEvalToolName(evaluation.input as PolicyEvalMap)}
                  </span>
                  <span
                    css={{
                      ...theme.partials.text.caption,
                      color: theme.colors['text-light'],
                    }}
                  >
                    {formatDateTime(evaluation.insertedAt, 'MMMM D, YYYY')}
                  </span>
                </Flex>
              </EvalLinkSC>
            )}
          />
        ) : (
          <Body2P
            $color="text-xlight"
            css={{ margin: `${theme.spacing.large}px auto` }}
          >
            {activeFilter === 'all'
              ? 'No evaluations available yet.'
              : 'No evaluations available for this filter.'}
          </Body2P>
        )}
      </Flex>
    </Flex>
  )
}

function DecisionBadge({ decision }: { decision: PolicyEvalDecision }) {
  const theme = useTheme()

  return (
    <div
      css={{
        alignItems: 'center',
        backgroundColor: theme.colors['fill-two'],
        border: theme.borders['fill-two'],
        borderRadius: '50%',
        display: 'flex',
        flexShrink: 0,
        height: 32,
        justifyContent: 'center',
        width: 32,
      }}
    >
      {decision.positive ? (
        <CheckIcon
          color="icon-success"
          size={12}
        />
      ) : (
        <CloseIcon
          color={decision.filterKey === 'deny' ? 'icon-danger' : 'icon-xlight'}
          size={12}
        />
      )}
    </div>
  )
}

function EvalFilterChip({
  filterKey,
  active,
  count,
  severity,
  disabled,
  onClick,
}: {
  filterKey: EvalFilter
  active: boolean
  count: number
  severity: ChipSeverity
  disabled: boolean
  onClick: () => void
}) {
  const theme = useTheme()

  return (
    <Chip
      size="small"
      severity={severity}
      clickable={!disabled}
      $active={active}
      inactive={disabled}
      onClick={disabled ? undefined : onClick}
      css={{
        borderRadius: 12,
        backgroundColor: active ? theme.colors['fill-one-selected'] : undefined,
        height: 'fit-content',
      }}
    >
      {FILTER_LABELS[filterKey]} ({count})
    </Chip>
  )
}

const EvalLinkSC = styled.button<{ $active?: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.medium,
    width: '100%',
    padding: `${theme.spacing.small}px ${theme.spacing.large}px ${theme.spacing.small}px ${theme.spacing.medium}px`,
    textAlign: 'left',
    backgroundColor: $active ? theme.colors['fill-one-selected'] : undefined,

    '&:hover': {
      backgroundColor: theme.colors['fill-one-selected'],
    },
  })
)
