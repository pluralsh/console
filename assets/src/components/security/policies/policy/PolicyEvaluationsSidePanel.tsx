import { CheckIcon, Chip, CloseIcon, Flex } from '@pluralsh/design-system'
import { type ComponentProps, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { Body2P } from 'components/utils/typography/Text'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { formatDateTime } from 'utils/datetime'
import { PolicyEvaluationFragment } from 'generated/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import {
  getPolicyEvalToolName,
  isPolicyEvalDenied,
  PolicyEvalMap,
} from './policyEval'

type EvalFilter = 'all' | 'deny' | 'allow'
type ChipSeverity = NonNullable<ComponentProps<typeof Chip>['severity']>

export function PolicyEvaluationsSidePanel({
  evals,
  loading,
  selectedEvalId,
  onSelectEvalId,
}: {
  evals: PolicyEvaluationFragment[]
  loading: boolean
  selectedEvalId?: string | null
  onSelectEvalId: (evalId: string) => void
}) {
  const theme = useTheme()
  const [activeFilter, setActiveFilter] = useState<EvalFilter>('all')

  const { filteredEvals, filterOptions } = useMemo(() => {
    const denied = evals.filter((evaluation) =>
      isPolicyEvalDenied(evaluation.output as PolicyEvalMap)
    )
    const allowed = evals.filter(
      (evaluation) => !isPolicyEvalDenied(evaluation.output as PolicyEvalMap)
    )

    return {
      filteredEvals:
        activeFilter === 'all'
          ? evals
          : activeFilter === 'deny'
            ? denied
            : allowed,
      filterOptions: [
        {
          key: 'all' as const,
          count: evals.length,
          severity: 'neutral' as ChipSeverity,
        },
        {
          key: 'deny' as const,
          count: denied.length,
          severity: 'danger' as ChipSeverity,
        },
        {
          key: 'allow' as const,
          count: allowed.length,
          severity: 'success' as ChipSeverity,
        },
      ],
    }
  }, [activeFilter, evals])

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
            onClick={() => setActiveFilter(key)}
          />
        ))}
      </Flex>
      <Flex
        direction="column"
        gap="xsmall"
        flex={1}
        minHeight={0}
        overflowY="auto"
      >
        {loading ? (
          <Flex
            direction="column"
            gap="xsmall"
            padding="small"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <RectangleSkeleton
                key={index}
                $height={52}
                $width="100%"
              />
            ))}
          </Flex>
        ) : filteredEvals.length ? (
          <Flex
            direction="column"
            gap="xsmall"
          >
            {filteredEvals.map((evaluation) => {
              const denied = isPolicyEvalDenied(
                evaluation.output as PolicyEvalMap
              )

              return (
                <EvalLinkSC
                  key={evaluation.id}
                  $active={selectedEvalId === evaluation.id}
                  onClick={() => onSelectEvalId(evaluation.id)}
                >
                  <DecisionBadge denied={denied} />
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
              )
            })}
          </Flex>
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

function DecisionBadge({ denied }: { denied: boolean }) {
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
      {denied ? (
        <CloseIcon
          color="icon-danger"
          size={12}
        />
      ) : (
        <CheckIcon
          color="icon-success"
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
  onClick,
}: {
  filterKey: EvalFilter
  active: boolean
  count: number
  severity: ChipSeverity
  onClick: () => void
}) {
  const theme = useTheme()
  const hasItems = count > 0

  return (
    <Chip
      size="small"
      severity={severity}
      clickable={hasItems}
      $active={active}
      inactive={!hasItems}
      onClick={hasItems ? onClick : undefined}
      css={{
        borderRadius: 12,
        minWidth: 80,
        backgroundColor: active ? theme.colors['fill-one-selected'] : undefined,
        height: 'fit-content',
      }}
    >
      <span css={{ textTransform: 'capitalize' }}>
        {filterKey} ({count})
      </span>
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
