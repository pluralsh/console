import { Chip, Flex } from '@pluralsh/design-system'
import { type ComponentProps, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { Body2P } from 'components/utils/typography/Text'
import {
  evalGradeToCategory,
  evalGradeToColor,
  EvalGradeCategory,
} from 'components/workbenches/common/evalGrade'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { formatDateTime } from 'utils/datetime'
import { WorkbenchEvalJobFragment } from 'generated/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import { groupBy } from 'lodash'

type EvalFilter = 'all' | EvalGradeCategory
type ChipSeverity = NonNullable<ComponentProps<typeof Chip>['severity']>

export function WorkbenchEvalsSidePanel({
  jobs,
  loading,
  selectedJobId,
  onSelectJobId,
}: {
  jobs: WorkbenchEvalJobFragment[]
  loading: boolean
  selectedJobId?: string | null
  onSelectJobId: (jobId: string) => void
}) {
  const theme = useTheme()
  const [activeFilter, setActiveFilter] = useState<EvalFilter>('all')

  const { filteredJobs, counts } = useMemo(() => {
    const byCategory = groupBy(jobs, (job) =>
      evalGradeToCategory(job.evalResult?.grade ?? 0)
    )

    return {
      filteredJobs:
        activeFilter === 'all' ? jobs : (byCategory[activeFilter] ?? []),
      counts: {
        all: jobs.length,
        bad: byCategory.bad?.length ?? 0,
        okay: byCategory.okay?.length ?? 0,
        great: byCategory.great?.length ?? 0,
      },
    }
  }, [activeFilter, jobs])

  const filterOptions = useMemo(
    () => [
      {
        key: 'all' as const,
        count: counts.all,
        severity: 'neutral' as ChipSeverity,
      },
      {
        key: 'bad' as const,
        count: counts.bad,
        severity: 'danger' as ChipSeverity,
      },
      {
        key: 'okay' as const,
        count: counts.okay,
        severity: 'warning' as ChipSeverity,
      },
      {
        key: 'great' as const,
        count: counts.great,
        severity: 'success' as ChipSeverity,
      },
    ],
    [counts]
  )

  return (
    <Flex
      direction="column"
      minHeight={0}
      overflow="hidden"
      css={{
        borderRight: theme.borders['fill-one'],
        minWidth: 350,
        maxWidth: 350,
      }}
    >
      <Flex
        direction="column"
        height="100%"
        minHeight={0}
        overflow="hidden"
      >
        <Flex
          alignItems="center"
          gap="xsmall"
          height={73}
          padding="medium"
          wrap="wrap"
          css={{ borderBottom: theme.borders['fill-one'] }}
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
          gap="small"
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
          ) : filteredJobs.length ? (
            <Flex direction="column">
              {filteredJobs.map((job) => (
                <EvalLinkSC
                  key={job.id}
                  $active={selectedJobId === job.id}
                  onClick={() => onSelectJobId(job.id)}
                >
                  <ScoreBadgeSC
                    $color={evalGradeToColor(job.evalResult?.grade ?? 0)}
                  >
                    {Math.round(job.evalResult?.grade ?? 0)}
                  </ScoreBadgeSC>
                  <Flex
                    direction="column"
                    gap="xxxsmall"
                    minWidth={0}
                  >
                    <span
                      css={{
                        ...TRUNCATE,
                        ...theme.partials.text.body2LooseLineHeight,
                        color: theme.colors['text-light'],
                      }}
                    >
                      {job.prompt}
                    </span>
                    <span
                      css={{
                        ...theme.partials.text.caption,
                        color: theme.colors['text-light'],
                      }}
                    >
                      {formatDateTime(job.insertedAt, 'MMMM D, YYYY')}
                    </span>
                  </Flex>
                </EvalLinkSC>
              ))}
            </Flex>
          ) : (
            <Body2P
              $color="text-xlight"
              css={{ margin: `${theme.spacing.large}px auto` }}
            >
              {activeFilter === 'all'
                ? 'No evals available yet.'
                : 'No evals available for this filter.'}
            </Body2P>
          )}
        </Flex>
      </Flex>
    </Flex>
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

  return (
    <Chip
      size="small"
      severity={severity}
      clickable={count > 0}
      $active={active}
      inactive={count === 0}
      onClick={count === 0 ? undefined : onClick}
      css={{
        borderRadius: 12,
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
    gap: theme.spacing.small,
    width: '100%',
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    textAlign: 'left',
    backgroundColor: $active ? theme.colors['fill-two'] : undefined,

    '&:hover': {
      backgroundColor: theme.colors['fill-two'],
    },
  })
)

const ScoreBadgeSC = styled.div<{ $color: string }>(({ theme, $color }) => ({
  ...theme.partials.text.caption,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: '50%',
  color: $color,
  display: 'flex',
  flexShrink: 0,
  fontWeight: 600,
  height: 32,
  justifyContent: 'center',
  width: 32,
}))
