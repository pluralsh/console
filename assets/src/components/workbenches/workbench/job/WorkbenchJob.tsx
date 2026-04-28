import {
  Button,
  EmptyState,
  Flex,
  SidePanelOpenIcon,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useCancelWorkbenchJobMutation,
  useWorkbenchJobQuery,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { isEmpty, truncate } from 'lodash'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
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
import { WorkbenchToolIcon } from '../../tools/workbenchToolsUtils'
import { SaveWorkbenchPromptButton } from '../SaveWorkbenchPromptButton'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { useWorkbenchJobPanel } from './WorkbenchJobPanel'

const MAX_VISIBLE_JOB_TOOLS = 3

export function WorkbenchJob() {
  const theme = useTheme()
  const { [WORKBENCH_JOBS_PARAM_JOB]: jobId = '' } = useParams()
  const { popToast } = useSimpleToast()
  const { isOpen, setOpen } = useWorkbenchJobPanel()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  const onMount = useEffectEvent(() => setOpen(true))
  useEffect(() => {
    onMount()
  }, [])

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

  const workbenchId = job?.workbench?.id ?? ''
  const workbenchName = job?.workbench?.name ?? 'workbench'
  const trimmedPrompt = job?.prompt?.trim() ?? ''
  const breadcrumbPrompt = trimmedPrompt || 'workbench job'

  const [cancelWorkbenchJob, { loading: cancelLoading, error: cancelError }] =
    useCancelWorkbenchJobMutation({
      awaitRefetchQueries: true,
      refetchQueries: [
        'WorkbenchJob',
        'WorkbenchJobs',
        'WorkbenchJobActivities',
      ],
      onCompleted: () => {
        setCancelModalOpen(false)
        popToast({ content: 'job cancelled', severity: 'danger' })
      },
    })

  const canCancelJob =
    job?.status === WorkbenchJobStatus.Pending ||
    job?.status === WorkbenchJobStatus.Running
  const jobTools = job?.workbench?.tools?.filter(isNonNullable) ?? []
  const visibleJobTools = jobTools.slice(0, MAX_VISIBLE_JOB_TOOLS)
  const hiddenJobTools = jobTools.slice(MAX_VISIBLE_JOB_TOOLS)
  const hiddenJobToolsLabel = hiddenJobTools
    .map((tool) => tool.name)
    .filter(Boolean)
    .join(', ')

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
            margin="large"
            css={{ marginBottom: 0 }}
          />
        )}

        <StretchedFlex gap="xlarge">
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
                    <Flex gap="xsmall">
                      {visibleJobTools.map((tool) => (
                        <Tooltip
                          key={tool.id}
                          label={tool.name}
                          placement="bottom"
                        >
                          <WorkbenchToolIcon
                            type={tool.tool}
                            provider={tool.cloudConnection?.provider}
                            size={12}
                          />
                        </Tooltip>
                      ))}
                      {!isEmpty(hiddenJobTools) && (
                        <Tooltip
                          label={
                            hiddenJobToolsLabel ||
                            `${hiddenJobTools.length} more`
                          }
                          placement="bottom"
                        >
                          <span>+{hiddenJobTools.length}</span>
                        </Tooltip>
                      )}
                    </Flex>
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
            {canCancelJob ? (
              <Button
                small
                destructive
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel job
              </Button>
            ) : (
              <RunStatusChip
                loading={isLoading}
                status={job?.status}
                showSpinner={false}
              />
            )}
            <SaveWorkbenchPromptButton
              workbenchId={workbenchId}
              prompt={trimmedPrompt}
            />
          </Flex>
        </StretchedFlex>
        <WorkbenchJobActivities jobId={jobId} />
        <Confirm
          open={cancelModalOpen}
          close={() => setCancelModalOpen(false)}
          destructive
          label="Cancel job"
          loading={cancelLoading}
          error={cancelError}
          submit={() => cancelWorkbenchJob({ variables: { jobId } })}
          title="Cancel job"
          text="Are you sure you want to cancel this job?"
        />
      </WrapperSC>
      {!isOpen && (
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
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  minWidth: 0,
  maxWidth: theme.breakpoints.desktopLarge,
  padding: theme.spacing.large,
}))
