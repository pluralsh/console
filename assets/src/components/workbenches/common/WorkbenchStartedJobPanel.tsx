import {
  ArrowTopRightIcon,
  Button,
  Flex,
  IconFrame,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  useCancelWorkbenchJobMutation,
  useWorkbenchJobQuery,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

export function WorkbenchStartedJobPanel({
  initialJob,
  jobId,
  workbenchId,
}: {
  initialJob: WorkbenchJobFragment
  jobId: string
  workbenchId: string
}) {
  const {
    data,
    error: queryError,
    startPolling,
    stopPolling,
  } = useWorkbenchJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !jobId,
    notifyOnNetworkStatusChange: true,
  })

  const job = data?.workbenchJob ?? initialJob
  const cancellable = isJobRunning(job.status)

  useEffect(() => {
    if (cancellable) startPolling(POLL_INTERVAL)
    else stopPolling()

    return () => stopPolling()
  }, [cancellable, startPolling, stopPolling])

  const [cancelWorkbenchJob, { loading, error: cancelError }] =
    useCancelWorkbenchJobMutation({
      variables: { jobId },
      awaitRefetchQueries: true,
      refetchQueries: ['WorkbenchJob'],
    })

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {queryError && <GqlError error={queryError} />}
      {cancelError && <GqlError error={cancelError} />}
      <StartedJobCardSC>
        <Flex
          direction="column"
          gap="xxsmall"
          flex={1}
          minWidth={0}
        >
          <Body2BoldP $color="text">Started workbench job</Body2BoldP>
          <Body2P
            $color="text-light"
            css={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {job.prompt}
          </Body2P>
        </Flex>
        <RunStatusChip
          status={job.status}
          showSpinner
        />
      </StartedJobCardSC>
      <Flex justify={cancellable ? 'space-between' : 'flex-end'}>
        {cancellable && (
          <Button
            destructive
            loading={loading}
            onClick={() => cancelWorkbenchJob()}
          >
            Cancel workbench run
          </Button>
        )}
        <Button
          as={Link}
          to={getWorkbenchJobAbsPath({ workbenchId, jobId })}
          endIcon={<ArrowTopRightIcon />}
        >
          See progress
        </Button>
      </Flex>
    </Flex>
  )
}

const StartedJobCardSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.large,
  display: 'flex',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  position: 'relative',

  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    padding: 1,
    background:
      'linear-gradient(315deg, rgba(92, 119, 255, 0) 0%, #494FF2 46%, rgba(143, 214, 255, 0.6) 79%, rgba(82, 244, 217, 0.5) 100%)',
    pointerEvents: 'none',
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  },
}))
