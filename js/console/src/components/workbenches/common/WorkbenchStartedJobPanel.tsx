import { ArrowTopRightIcon, Button, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  useCancelWorkbenchJobMutation,
  useWorkbenchJobDeltaSubscription,
  useWorkbenchJobQuery,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import { usePollWhileRunning } from 'components/workbenches/workbench/job/usePollWhileRunning'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
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
  const query = useWorkbenchJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    skip: !jobId,
    notifyOnNetworkStatusChange: true,
  })
  const { data, error: queryError } = query

  const job = data?.workbenchJob ?? initialJob
  const cancellable = isJobRunning(job.status)

  // the delta is normalized into the job, so polling only covers missed events
  useWorkbenchJobDeltaSubscription({
    variables: { id: jobId },
    skip: !jobId || !cancellable,
  })
  usePollWhileRunning(query, cancellable)

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
    padding: '1px',
    background:
      'linear-gradient(315deg, rgba(92, 119, 255, 0) 0%, #494FF2 46%, rgba(143, 214, 255, 0.6) 79%, rgba(82, 244, 217, 0.5) 100%)',
    pointerEvents: 'none',
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  },
}))
