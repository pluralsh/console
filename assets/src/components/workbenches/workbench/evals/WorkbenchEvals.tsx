import {
  Button,
  EmptyState,
  Flex,
  Markdown,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext } from '../Workbench'
import styled, { useTheme } from 'styled-components'
import { GqlError } from 'components/utils/Alert'
import { evalGradeToColor } from 'components/workbenches/common/evalGrade'
import {
  WorkbenchEvalJobFragment,
  useWorkbenchEvalSkillMutation,
  useWorkbenchEvalsQuery,
} from 'generated/graphql'
import { WorkbenchEvalsSidePanel } from './WorkbenchEvalsSidePanel'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { mapExistingNodes } from 'utils/graphql'

type QualityTab = 'prompt' | 'conclusion' | 'logic'

const qualityTabs: { key: QualityTab; label: string }[] = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'conclusion', label: 'Conclusion' },
  { key: 'logic', label: 'Logic and thoughts' },
]

const MOCK_EVAL_JOBS: WorkbenchEvalJobFragment[] = [
  {
    __typename: 'WorkbenchJob',
    id: 'mock-job-1',
    prompt: 'deploy the opentelemetry-demo helm chart upgrade',
    insertedAt: '2026-04-27T10:15:00.000Z',
    startedAt: '2026-04-27T10:14:10.000Z',
    completedAt: '2026-04-27T10:14:53.000Z',
    evalResult: {
      __typename: 'WorkbenchEvalResult',
      id: 'mock-eval-1',
      grade: 8,
      feedback: {
        __typename: 'WorkbenchEvalFeedback',
        summary:
          'The job demonstrated strong overall performance today. Prompt construction was clear and well-scoped in most runs.',
        prompt:
          'Prompts were specific, relevant to the triggering alert, and provided sufficient context.',
        result:
          'Conclusions were actionable and referenced relevant evidence. Minor weaknesses were observed in a few runs.',
        logic:
          '- Collaboration: Breaking down silos between development and operations teams.\n- Automation: Streamlining processes to reduce human error.\n- Continuous Integration (CI): Regularly merging code for automated validation.',
      },
    },
  },
  {
    __typename: 'WorkbenchJob',
    id: 'mock-job-2',
    prompt: 'Job prompt text',
    insertedAt: '2026-04-27T10:05:00.000Z',
    startedAt: '2026-04-27T10:03:10.000Z',
    completedAt: '2026-04-27T10:03:45.000Z',
    evalResult: {
      __typename: 'WorkbenchEvalResult',
      id: 'mock-eval-2',
      grade: 5,
      feedback: {
        __typename: 'WorkbenchEvalFeedback',
        summary:
          'Mixed quality results with inconsistent conclusion structure.',
        prompt: 'Prompt lacked concrete acceptance criteria in several steps.',
        result:
          'Some outcomes were useful but references to evidence were shallow.',
        logic: '- Needs clearer progression from hypotheses to validation.',
      },
    },
  },
]

export function WorkbenchEvals() {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const { workbenchId, setSideContent, setShowDescription, setHeaderActions } =
    useOutletContext<WorkbenchOutletContext>()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [qualityTab, setQualityTab] = useState<QualityTab>('prompt')
  const qualityTabsStateRef = useRef<any>(undefined)

  const { data, loading, error } = useWorkbenchEvalsQuery({
    variables: { id: workbenchId, first: 100 },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const jobs = useMemo(() => {
    const fetched = mapExistingNodes(data?.workbench?.runs).filter(
      (job) => !!job.evalResult
    )

    return fetched.length ? fetched : MOCK_EVAL_JOBS
  }, [data])

  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null

  useEffect(() => {
    if (jobs.length && !selectedJobId) setSelectedJobId(jobs[0].id)
  }, [jobs, selectedJobId])

  const [workbenchEvalSkill, { loading: skillMutationLoading }] =
    useWorkbenchEvalSkillMutation({
      onCompleted: () => {
        popToast({
          content: 'Skills update job started for this eval.',
          severity: 'success',
        })
      },
      onError: (e) => {
        popToast({
          content: e.message,
          severity: 'danger',
        })
      },
    })

  useEffect(() => {
    const evalResultId = selectedJob?.evalResult?.id

    setHeaderActions(
      <Button
        disabled={!evalResultId || skillMutationLoading || (loading && !data)}
        loading={skillMutationLoading}
        onClick={() => {
          if (!evalResultId) return
          workbenchEvalSkill({ variables: { id: evalResultId } })
        }}
      >
        Create skills from eval
      </Button>
    )

    return () => setHeaderActions(null)
  }, [
    data,
    loading,
    selectedJob?.evalResult?.id,
    setHeaderActions,
    skillMutationLoading,
    workbenchEvalSkill,
  ])

  useEffect(() => {
    setSideContent(
      <WorkbenchEvalsSidePanel
        jobs={jobs}
        loading={loading && !data}
        selectedJobId={selectedJob?.id}
        onSelectJobId={setSelectedJobId}
      />
    )
    setShowDescription(false)

    return () => {
      setSideContent(null)
      setShowDescription(true)
    }
  }, [data, jobs, loading, selectedJob?.id, setShowDescription, setSideContent])

  const feedback = selectedJob?.evalResult?.feedback
  const durationSeconds = getDurationSeconds(selectedJob)

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      flex={1}
      gap="medium"
      minHeight={0}
      overflow="hidden"
      css={{ borderTop: theme.borders['fill-one'] }}
    >
      {!selectedJob ? (
        <Flex
          align="center"
          flex={1}
          justify="center"
          minHeight={0}
        >
          <EmptyState message="No evals available yet." />
        </Flex>
      ) : (
        <ColumnsSC>
          <PanelSC>
            <PanelHeaderSC>Summary</PanelHeaderSC>
            <PanelBodySC>
              <Flex
                align="center"
                gap="medium"
              >
                <ScoreBadgeSC
                  $color={evalGradeToColor(selectedJob.evalResult?.grade ?? 0)}
                >
                  {Math.round(selectedJob.evalResult?.grade ?? 0)}
                </ScoreBadgeSC>
                <Flex direction="column">
                  <span
                    css={{ ...theme.partials.text.subtitle2, fontWeight: 400 }}
                  >
                    Overall grade:{' '}
                    {(selectedJob.evalResult?.grade ?? 0).toFixed(0)}/10
                  </span>
                  <span
                    css={{
                      ...theme.partials.text.body2,
                      color: theme.colors['text-light'],
                    }}
                  >
                    {durationSeconds && `${durationSeconds} seconds`}
                  </span>
                </Flex>
              </Flex>
              <Flex
                direction="column"
                css={{ marginTop: theme.spacing.medium }}
              >
                <Subtitle1H1>Summary</Subtitle1H1>
                <Markdown text={feedback?.summary ?? ''} />
              </Flex>
            </PanelBodySC>
          </PanelSC>

          <PanelSC>
            <PanelHeaderSC>Quality breakdown</PanelHeaderSC>
            <Flex
              css={{ backgroundColor: theme.colors['fill-one'], width: '100%' }}
            >
              <TabList
                stateRef={qualityTabsStateRef}
                stateProps={{
                  orientation: 'horizontal',
                  selectedKey: qualityTab,
                  onSelectionChange: (key) => setQualityTab(key as QualityTab),
                }}
                flexShrink={0}
              >
                {qualityTabs.map((tab) => (
                  <Tab
                    key={tab.key}
                    textValue={tab.label}
                  >
                    {tab.label}
                  </Tab>
                ))}
              </TabList>
              <Flex
                flex={1}
                minWidth={0}
                css={{
                  alignSelf: 'stretch',
                  borderBottom: theme.borders.default,
                }}
              />
            </Flex>
            <PanelBodySC>
              <Markdown
                text={
                  qualityTab === 'prompt'
                    ? (feedback?.prompt ?? 'No prompt available')
                    : qualityTab === 'conclusion'
                      ? (feedback?.result ?? 'No conclusion available')
                      : (feedback?.logic ?? 'No logic available')
                }
              />
            </PanelBodySC>
          </PanelSC>
        </ColumnsSC>
      )}
    </Flex>
  )
}

function getDurationSeconds(job: WorkbenchEvalJobFragment | null) {
  if (!job?.startedAt || !job.completedAt) return null

  return Math.max(
    Math.round(
      (new Date(job.completedAt).getTime() -
        new Date(job.startedAt).getTime()) /
        1000
    ),
    0
  )
}

const ColumnsSC = styled.div({
  display: 'grid',
  flex: 1,
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr)',
  minHeight: 0,
})

const PanelSC = styled.section(({ theme }) => ({
  borderRight: theme.borders['fill-one'],
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
}))

const PanelHeaderSC = styled.header(({ theme }) => ({
  ...theme.partials.text.overline,
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors['text-xlight'],
  flexShrink: 0,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders['fill-one'],
}))

const PanelBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing.medium,
}))

const ScoreBadgeSC = styled.div<{ $color: string }>(({ theme, $color }) => ({
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  border: `1px solid ${$color}`,
  borderRadius: '50%',
  color: $color,
  display: 'flex',
  fontWeight: 600,
  height: 40,
  justifyContent: 'center',
  minWidth: 40,
}))
