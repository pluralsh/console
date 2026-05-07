import { Chip, Flex } from '@pluralsh/design-system'
import { type ComponentProps, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { CaptionP } from 'components/utils/typography/Text'
import {
  evalGradeToCategory,
  evalGradeToColor,
  EvalGradeCategory,
} from 'components/workbenches/common/evalGrade'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { formatDateTime } from 'utils/datetime'
import { WorkbenchEvalsQuery, useWorkbenchEvalsQuery } from 'generated/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import { groupBy } from 'lodash'

type EvalFilter = 'all' | EvalGradeCategory
type ChipSeverity = NonNullable<ComponentProps<typeof Chip>['severity']>

type EvalJobRow = NonNullable<
  NonNullable<
    NonNullable<NonNullable<WorkbenchEvalsQuery['workbench']>['runs']>['edges']
  >[number]
>['node']

const MOCK_WORKBENCH_EVALS_SIDEPANEL_DATA: WorkbenchEvalsQuery = {
  workbench: {
    id: 'mock-workbench',
    runs: {
      edges: [
        {
          node: {
            id: 'mock-job-1',
            prompt: 'deploy the opentelemetry-demo helm chart upgrade',
            insertedAt: '2026-04-27T10:15:00.000Z',
            evalResult: {
              id: 'mock-eval-1',
              grade: 1,
              feedback: { summary: 'Low confidence in rollout safety checks.' },
            },
          },
        },
        {
          node: {
            id: 'mock-job-2',
            prompt: 'Job prompt text',
            insertedAt: '2026-04-27T10:05:00.000Z',
            evalResult: {
              id: 'mock-eval-2',
              grade: 8,
              feedback: { summary: 'Good plan with clear remediation steps.' },
            },
          },
        },
        {
          node: {
            id: 'mock-job-3',
            prompt: 'deploy the opentelemetry-demo helm values update',
            insertedAt: '2026-04-27T09:55:00.000Z',
            evalResult: {
              id: 'mock-eval-3',
              grade: 5,
              feedback: {
                summary: 'Needs more explicit verification criteria.',
              },
            },
          },
        },
        {
          node: {
            id: 'mock-job-4',
            prompt: 'deploy the opentelemetry-demo helm rollback check',
            insertedAt: '2026-04-27T09:45:00.000Z',
            evalResult: {
              id: 'mock-eval-4',
              grade: 10,
              feedback: { summary: 'Excellent execution and communication.' },
            },
          },
        },
        {
          node: {
            id: 'mock-job-5',
            prompt: 'deploy the opentelemetry-demo helm canary strategy',
            insertedAt: '2026-04-27T09:35:00.000Z',
            evalResult: {
              id: 'mock-eval-5',
              grade: 4,
              feedback: {
                summary: 'Partially complete reasoning around risk.',
              },
            },
          },
        },
        {
          node: {
            id: 'mock-job-6',
            prompt: 'deploy the opentelemetry-demo helm SLO verification',
            insertedAt: '2026-04-27T09:25:00.000Z',
            evalResult: {
              id: 'mock-eval-6',
              grade: 4,
              feedback: {
                summary: 'Insufficient evidence for production safety.',
              },
            },
          },
        },
        {
          node: {
            id: 'mock-job-7',
            prompt: 'deploy the opentelemetry-demo helm final rollout',
            insertedAt: '2026-04-27T09:15:00.000Z',
            evalResult: {
              id: 'mock-eval-7',
              grade: 10,
              feedback: {
                summary: 'Great quality and complete runbook coverage.',
              },
            },
          },
        },
      ],
    },
  },
}

export function WorkbenchEvalsSidePanel({
  workbenchId,
}: {
  workbenchId: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<EvalFilter>('all')

  // We fetch only the first 100 evals as filtering is done on the client side.
  const { data, loading } = useWorkbenchEvalsQuery({
    variables: { id: workbenchId, first: 100 },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const jobs = useMemo(() => {
    const fromEdges = (
      edges: Array<{ node?: EvalJobRow | null } | null> | null | undefined = []
    ) =>
      (edges ?? [])
        .flatMap((edge) => (edge?.node ? [edge.node] : []))
        .filter((job) => !!job.evalResult)

    const fetched = fromEdges(data?.workbench?.runs?.edges)
    const source = fetched.length
      ? fetched
      : fromEdges(MOCK_WORKBENCH_EVALS_SIDEPANEL_DATA.workbench?.runs?.edges)

    return source.sort(
      (a, b) =>
        (b.insertedAt ? new Date(b.insertedAt).getTime() : 0) -
        (a.insertedAt ? new Date(a.insertedAt).getTime() : 0)
    )
  }, [data])

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
    <WrapperSC>
      <ContentSC>
        <Flex
          gap="xsmall"
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
        <ListSC>
          {loading && !data ? (
            <Flex
              direction="column"
              gap="xsmall"
            >
              <RectangleSkeleton
                $height={52}
                $width="100%"
              />
              <RectangleSkeleton
                $height={52}
                $width="100%"
              />
              <RectangleSkeleton
                $height={52}
                $width="100%"
              />
            </Flex>
          ) : filteredJobs.length ? (
            <Flex
              direction="column"
              gap="xxsmall"
            >
              {filteredJobs.map((job) => (
                <EvalLinkSC
                  key={job.id}
                  onClick={() =>
                    navigate(
                      getWorkbenchJobAbsPath({ workbenchId, jobId: job.id })
                    )
                  }
                >
                  <ScoreBadgeSC
                    $color={evalGradeToColor(job.evalResult?.grade ?? 0)}
                  >
                    {Math.round(job.evalResult?.grade ?? 0)}
                  </ScoreBadgeSC>
                  <EvalTextWrapSC>
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
                  </EvalTextWrapSC>
                </EvalLinkSC>
              ))}
            </Flex>
          ) : (
            <CaptionP
              $color="text-xlight"
              css={{ margin: 0 }}
            >
              No evals available for this filter.
            </CaptionP>
          )}
        </ListSC>
      </ContentSC>
    </WrapperSC>
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
      clickable
      $active={active}
      onClick={onClick}
      css={{
        borderRadius: 12,
        backgroundColor: active ? theme.colors['fill-one-selected'] : undefined,
      }}
    >
      <span css={{ textTransform: 'capitalize' }}>
        {filterKey} ({count})
      </span>
    </Chip>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  borderRight: theme.borders['fill-one'],
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  minHeight: 0,
  minWidth: 350,
  maxWidth: 350,
  overflowX: 'hidden',
  overflowY: 'hidden',
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
}))

const ListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.small,
  minHeight: 0,
  overflowY: 'auto',
}))

const EvalLinkSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  textAlign: 'left',

  '&:hover': {
    backgroundColor: theme.colors['fill-two'],
  },
}))

const EvalTextWrapSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  minWidth: 0,
}))

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
