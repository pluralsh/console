import {
  Button,
  EmptyState,
  Flex,
  HamburgerMenuCollapsedIcon,
  HamburgerMenuCollapseIcon,
  IconFrame,
  Markdown,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  getWorkbenchEvalResultAbsPath,
  WORKBENCH_EVAL_RESULT_PARAM_ID,
  getWorkbenchEvalSettingsAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { GqlError } from 'components/utils/Alert'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { WorkbenchEvalSkillButton } from 'components/workbenches/common/WorkbenchEvalSkillButton'
import {
  WorkbenchEvalResultRowFragment,
  useWorkbenchEvalsQuery,
} from 'generated/graphql'
import { WorkbenchEvalsSidePanel } from './WorkbenchEvalsSidePanel'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { mapExistingNodes } from 'utils/graphql'

type QualityTab = 'prompt' | 'conclusion' | 'logic'

type EvalRow = WorkbenchEvalResultRowFragment & {
  workbenchJob: NonNullable<WorkbenchEvalResultRowFragment['workbenchJob']>
}

const qualityTabs: { key: QualityTab; label: string }[] = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'conclusion', label: 'Conclusion' },
  { key: 'logic', label: 'Logic and thoughts' },
]

export function WorkbenchEvals() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const evalResultIdFromPath = useParams()[WORKBENCH_EVAL_RESULT_PARAM_ID]
  const [qualityTab, setQualityTab] = useState<QualityTab>('prompt')
  const [qualityBreakdownCollapsed, setQualityBreakdownCollapsed] =
    useState(false)
  const qualityTabsStateRef = useRef<any>(undefined)

  const { data, loading, error } = useWorkbenchEvalsQuery({
    variables: { id: workbenchId, first: 100 },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const evalRows = useMemo(() => {
    return mapExistingNodes(data?.workbench?.evalResults).filter(
      (r): r is EvalRow => !!r.workbenchJob
    )
  }, [data])

  const selectedEvalRowFromPath =
    evalRows.find((r) => r.id === evalResultIdFromPath) ?? null
  const selectedEvalRow = selectedEvalRowFromPath ?? evalRows[0] ?? null

  const feedback = selectedEvalRow?.feedback
  const grade = selectedEvalRow?.grade ?? 0
  const feedbackByTab: Record<QualityTab, string> = {
    prompt: feedback?.prompt ?? 'No prompt available',
    conclusion: feedback?.result ?? 'No conclusion available',
    logic: feedback?.logic ?? 'No logic available',
  }
  const durationSeconds = getDurationSeconds(selectedEvalRow?.workbenchJob)
  const selectedEvalResultIdForSkill = selectedEvalRow?.id

  useEffect(() => {
    if (!selectedEvalRow?.id || evalResultIdFromPath === selectedEvalRow.id)
      return

    navigate(
      getWorkbenchEvalResultAbsPath({
        workbenchId,
        evalResultId: selectedEvalRow.id,
      }),
      { replace: true }
    )
  }, [evalResultIdFromPath, navigate, selectedEvalRow?.id, workbenchId])

  return (
    <WorkbenchPageLayout
      showDescription={false}
      showEditWorkbenchButton={false}
      sidebar={{
        kind: 'custom',
        content: (
          <WorkbenchEvalsSidePanel
            evalRows={evalRows}
            loading={loading && !data}
            selectedEvalResultId={selectedEvalRow?.id}
            onSelectEvalResultId={(evalResultId) =>
              navigate(
                getWorkbenchEvalResultAbsPath({
                  workbenchId,
                  evalResultId,
                })
              )
            }
          />
        ),
      }}
      headerActions={
        <Flex gap="small">
          <Button
            secondary
            onClick={() =>
              navigate(getWorkbenchEvalSettingsAbsPath(workbenchId))
            }
          >
            Eval settings
          </Button>
          <WorkbenchEvalSkillButton
            disabled={loading && !data}
            evalResultId={selectedEvalResultIdForSkill}
            workbenchId={workbenchId}
          />
        </Flex>
      }
    >
      {error ? (
        <GqlError error={error} />
      ) : (
        <EvalsContentSC>
          {!selectedEvalRow ? (
            <Flex
              align="center"
              flex={1}
              justify="center"
              minHeight={0}
            >
              <EmptyState message="No evals available yet." />
            </Flex>
          ) : (
            <ColumnsSC $qualityCollapsed={qualityBreakdownCollapsed}>
              <PanelSC $trimRightBorder={qualityBreakdownCollapsed}>
                <PanelHeaderSC>
                  <Flex
                    align="center"
                    justify="space-between"
                    gap="small"
                    width="100%"
                  >
                    <span css={{ flexShrink: 0 }}>Summary</span>
                    {qualityBreakdownCollapsed && (
                      <IconFrame
                        clickable
                        type="tertiary"
                        size="small"
                        textValue="Expand quality breakdown"
                        icon={<HamburgerMenuCollapseIcon />}
                        tooltip="Expand quality breakdown"
                        onClick={() => setQualityBreakdownCollapsed(false)}
                      />
                    )}
                  </Flex>
                </PanelHeaderSC>
                <PanelBodySC>
                  <Flex
                    align="center"
                    gap="medium"
                  >
                    <WorkbenchEvalGradeBadge
                      grade={grade}
                      size="medium"
                    />
                    <Flex direction="column">
                      <span
                        css={{
                          ...theme.partials.text.subtitle2,
                          fontWeight: 400,
                        }}
                      >
                        Overall grade: {grade.toFixed(0)}/10
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

              {!qualityBreakdownCollapsed && (
                <PanelSC $trimRightBorder>
                  <PanelHeaderSC>
                    <Flex
                      alignItems="center"
                      justify="space-between"
                      gap="small"
                      width="100%"
                    >
                      <span css={{ flexShrink: 0 }}>Quality breakdown</span>
                      <IconFrame
                        clickable
                        type="tertiary"
                        size="small"
                        textValue="Collapse quality breakdown"
                        icon={<HamburgerMenuCollapsedIcon />}
                        tooltip="Collapse quality breakdown"
                        onClick={() => setQualityBreakdownCollapsed(true)}
                      />
                    </Flex>
                  </PanelHeaderSC>
                  <Flex
                    css={{
                      backgroundColor: theme.colors['fill-one'],
                      width: '100%',
                    }}
                  >
                    <TabList
                      stateRef={qualityTabsStateRef}
                      stateProps={{
                        orientation: 'horizontal',
                        selectedKey: qualityTab,
                        onSelectionChange: (key) =>
                          setQualityTab(key as QualityTab),
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
                    <Markdown text={feedbackByTab[qualityTab]} />
                  </PanelBodySC>
                </PanelSC>
              )}
            </ColumnsSC>
          )}
        </EvalsContentSC>
      )}
    </WorkbenchPageLayout>
  )
}

function getDurationSeconds(job: EvalRow['workbenchJob'] | null | undefined) {
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

const EvalsContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  overflow: 'hidden',
  borderTop: theme.borders['fill-one'],
}))

const ColumnsSC = styled.div<{ $qualityCollapsed: boolean }>(
  ({ $qualityCollapsed }) => ({
    display: 'grid',
    flex: 1,
    gridTemplateColumns: $qualityCollapsed
      ? 'minmax(0, 1fr)'
      : 'minmax(0, 1fr) minmax(0, 1fr)',
    gridTemplateRows: 'minmax(0, 1fr)',
    minHeight: 0,
  })
)

const PanelSC = styled.section<{ $trimRightBorder?: boolean }>(
  ({ theme, $trimRightBorder }) => ({
    borderRight: $trimRightBorder ? undefined : theme.borders['fill-one'],
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  })
)

const PanelHeaderSC = styled.header(({ theme }) => ({
  ...theme.partials.text.overline,
  backgroundColor: theme.colors['fill-one'],
  boxSizing: 'border-box',
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  lineHeight: 1,
  minHeight: 40,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders['fill-one'],
  width: '100%',
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
