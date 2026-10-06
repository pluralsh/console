import {
  Button,
  EmptyState,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useSidePanelWidth } from 'components/layout/TopLevelSidePanel'
import { GqlError } from 'components/utils/Alert'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchJobQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
  WORKBENCH_JOBS_PARAM_JOB,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { SaveWorkbenchPromptButton } from '../SaveWorkbenchPromptButton'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { WorkbenchJobMeta } from './WorkbenchJobMeta'
import { isJobRunning } from './WorkbenchJobActivity'
import { useWorkbenchJobPanel } from './WorkbenchJobPanel'
import { hasWorkbenchJobPanelContent } from './workbenchJobResultUtils'
import { useWorkbenchJobActionSummary } from './useWorkbenchJobActionSummary'

export function WorkbenchJob() {
  const theme = useTheme()
  const { [WORKBENCH_JOBS_PARAM_JOB]: jobId = '' } = useParams()
  const {
    data,
    loading,
    error: queryError,
  } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const job = data?.workbenchJob
  const isLoading = loading && !job
  const { hasActions } = useWorkbenchJobActionSummary(jobId)
  const hasPanelContent = hasWorkbenchJobPanelContent(job, hasActions)

  const { isOpen, setOpen } = useWorkbenchJobPanel(!!job?.id && hasPanelContent)
  useSidePanelWidth({
    maxWidthVw: 60,
    initialWidthVw:
      Boolean(job?.result?.conclusion) && !isJobRunning(job?.status)
        ? 60
        : undefined,
  })

  const workbenchId = job?.workbench?.id ?? ''
  const workbenchName = job?.workbench?.name ?? 'workbench'
  const trimmedPrompt = job?.prompt?.trim() ?? ''
  const breadcrumbPrompt = prettifyPrompt(trimmedPrompt) || 'workbench job'

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        { label: workbenchName, url: getWorkbenchAbsPath(workbenchId) },
        {
          label: truncate(breadcrumbPrompt, { length: 50 }),
          url: getWorkbenchJobAbsPath({ workbenchId, jobId }),
        },
      ],
      [breadcrumbPrompt, jobId, workbenchId, workbenchName]
    )
  )

  if (!(job || loading))
    return !jobId ||
      queryError?.message?.includes('could not find resource') ? (
      <EmptyState message="Workbench job not found." />
    ) : (
      <GqlError
        header="Failed to load workbench job"
        margin="large"
        error={queryError}
      />
    )

  return (
    <StretchedFlex
      gap="small"
      height="100%"
      align="stretch"
    >
      <MainColumnSC>
        <WrapperSC>
          {job?.error && (
            <GqlError
              header="Workbench job reported an error"
              error={job?.error}
              css={{ marginBottom: theme.spacing.small }}
            />
          )}

          <StretchedFlex
            gap="xlarge"
            css={{
              borderBottom: theme.borders.default,
              paddingBottom: theme.spacing.large,
            }}
          >
            <StackedText
              truncate
              loading={isLoading}
              gap="xxsmall"
              first={job?.workbench?.name}
              firstColor="text"
              firstPartialType="subtitle2"
              second={job && <WorkbenchJobMeta job={job} />}
              secondColor="text-xlight"
              secondPartialType="body2"
            />
            <Flex
              align="center"
              gap="small"
            >
              <RunStatusIcon
                fullColor
                status={job?.status}
              />
              <SaveWorkbenchPromptButton
                workbenchId={workbenchId}
                prompt={trimmedPrompt}
              />
            </Flex>
          </StretchedFlex>
          <WorkbenchJobActivities
            jobId={jobId}
            workbenchId={workbenchId}
            workbenchName={workbenchName}
          />
        </WrapperSC>
      </MainColumnSC>
      {!!job?.id && hasPanelContent && !isOpen && (
        <PanelOpenBtnSC
          tertiary
          onClick={() => setOpen(true)}
        >
          <SidePanelOpenIcon />
        </PanelOpenBtnSC>
      )}
    </StretchedFlex>
  )
}

const PanelOpenBtnSC = styled(Button)(({ theme }) => ({
  height: '100%',
  borderLeft: theme.borders.default,
  flexShrink: 0,
}))

const MainColumnSC = styled.div({
  flex: 1,
  minWidth: 0,
  height: '100%',
})

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  minWidth: 0,
  padding: theme.spacing.large,
}))
