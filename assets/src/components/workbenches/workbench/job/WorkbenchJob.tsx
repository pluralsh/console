import {
  Button,
  EmptyState,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchJobQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { useEffect, useEffectEvent, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
  WORKBENCH_JOBS_PARAM_JOB,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchJobActivities } from './WorkbenchJobActivities'
import { useWorkbenchJobPanel } from './WorkbenchJobPanel'

export function WorkbenchJob() {
  const { [WORKBENCH_JOBS_PARAM_JOB]: jobId = '' } = useParams()
  const { isOpen, setOpen } = useWorkbenchJobPanel()

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

  const [workbenchId, workbenchName, prompt] = [
    job?.workbench?.id ?? '',
    job?.workbench?.name ?? 'workbench',
    job?.prompt ?? 'workbench job',
  ]
  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
        { label: workbenchName, url: getWorkbenchAbsPath(workbenchId) },
        {
          label: truncate(prompt ?? '', { length: 50 }),
          url: getWorkbenchJobAbsPath({ workbenchId, jobId }),
        },
      ],
      [prompt, jobId, workbenchId, workbenchName]
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
            first={job?.workbench?.name}
            firstColor="text"
            firstPartialType="subtitle2"
            second={job?.prompt}
            secondColor="text-xlight"
            secondPartialType="body2"
          />
          <RunStatusChip
            loading={isLoading}
            status={job?.status}
          />
        </StretchedFlex>
        <WorkbenchJobActivities jobId={jobId} />
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
