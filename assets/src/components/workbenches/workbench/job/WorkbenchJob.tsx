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
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { useWorkbenchJobQuery } from 'generated/graphql'
import { isEmpty, truncate } from 'lodash'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
  WORKBENCH_JOBS_PARAM_JOB,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { SaveWorkbenchPromptButton } from '../SaveWorkbenchPromptButton'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { isJobRunning } from './WorkbenchJobActivity'
import { useWorkbenchJobPanel } from './WorkbenchJobPanel'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { hasWorkbenchJobResultContent } from './workbenchJobResultUtils'

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
  const hasResultContent = hasWorkbenchJobResultContent(job)

  const { isOpen, setOpen } = useWorkbenchJobPanel(
    !!job?.id && hasResultContent
  )
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

  const jobTools = job?.workbench?.tools?.filter(isNonNullable) ?? []

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
    >
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
            second={
              job && (
                <Flex
                  gap="medium"
                  css={{
                    ...theme.partials.text.caption,
                    color: theme.colors['text-xlight'],
                  }}
                >
                  {job.user?.name?.trim() && (
                    <span>{job.user.name.trim()}</span>
                  )}
                  {job.insertedAt && (
                    <span>
                      {formatDateTime(
                        job.insertedAt,
                        'YYYY-MM-DD ',
                        false,
                        true
                      )}
                      <span css={{ color: theme.colors['code-block-purple'] }}>
                        {formatDateTime(
                          job.insertedAt,
                          'HH:mm:ss',
                          false,
                          true
                        )}
                      </span>
                      {formatDateTime(job.insertedAt, ' [UTC]', false, true)}
                    </span>
                  )}
                  {!isEmpty(jobTools) && (
                    <MetadataIcons
                      maxVisibleItems={3}
                      items={jobTools.map((tool) => ({
                        id: tool.id,
                        label: tool.name,
                        icon: (
                          <WorkbenchToolIcon
                            type={tool.tool}
                            provider={tool.cloudConnection?.provider}
                            size={12}
                          />
                        ),
                      }))}
                    />
                  )}
                </Flex>
              )
            }
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
      {hasResultContent && !isOpen && (
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
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  minWidth: 0,
  maxWidth: theme.breakpoints.desktopLarge,
  padding: theme.spacing.large,
}))
