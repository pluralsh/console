import { Chip, Flex } from '@pluralsh/design-system'
import { type ComponentProps, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { WorkbenchStoredPromptMarkdown } from '../WorkbenchStoredPromptMarkdown'
import { Body2P } from 'components/utils/typography/Text'
import {
  evalGradeToCategory,
  EvalGradeCategory,
} from 'components/workbenches/common/evalGrade'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { formatDateTime } from 'utils/datetime'
import { WorkbenchEvalResultRowFragment } from 'generated/graphql'
import { groupBy } from 'lodash'

type EvalRow = WorkbenchEvalResultRowFragment & {
  workbenchJob: NonNullable<WorkbenchEvalResultRowFragment['workbenchJob']>
}

type EvalFilter = 'all' | EvalGradeCategory
type ChipSeverity = NonNullable<ComponentProps<typeof Chip>['severity']>

export function WorkbenchEvalsSidePanel({
  evalRows,
  loading,
  selectedEvalResultId,
  onSelectEvalResultId,
}: {
  evalRows: EvalRow[]
  loading: boolean
  selectedEvalResultId?: string | null
  onSelectEvalResultId: (evalResultId: string) => void
}) {
  const theme = useTheme()
  const [activeFilter, setActiveFilter] = useState<EvalFilter>('all')

  const { filteredEvalRows, filterOptions } = useMemo(() => {
    const byCategory = groupBy(evalRows, (row) =>
      evalGradeToCategory(row.grade ?? 0)
    )
    const counts = {
      all: evalRows.length,
      bad: byCategory.bad?.length ?? 0,
      okay: byCategory.okay?.length ?? 0,
      great: byCategory.great?.length ?? 0,
    }

    return {
      filteredEvalRows:
        activeFilter === 'all'
          ? evalRows
          : ((byCategory[activeFilter] as EvalRow[] | undefined) ?? []),
      filterOptions: [
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
    }
  }, [activeFilter, evalRows])

  return (
    <Flex
      direction="column"
      minHeight={0}
      overflow="hidden"
      height="100%"
      css={{
        backgroundColor: theme.colors['fill-accent'],
        borderRight: theme.borders['fill-one'],
        minWidth: 350,
        maxWidth: 350,
      }}
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
        ) : filteredEvalRows.length ? (
          <Flex direction="column">
            {filteredEvalRows.map((row) => (
              <EvalLinkSC
                key={row.id}
                $active={selectedEvalResultId === row.id}
                onClick={() => onSelectEvalResultId(row.id)}
              >
                <WorkbenchEvalGradeBadge grade={row.grade ?? 0} />
                <Flex
                  direction="column"
                  gap="xxxsmall"
                  minWidth={0}
                >
                  <WorkbenchStoredPromptMarkdown
                    text={row.workbenchJob.prompt ?? ''}
                    density="tableCell"
                    clampLines={1}
                  />
                  <span
                    css={{
                      ...theme.partials.text.caption,
                      color: theme.colors['text-light'],
                    }}
                  >
                    {formatDateTime(
                      row.workbenchJob.insertedAt,
                      'MMMM D, YYYY'
                    )}
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
