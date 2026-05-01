import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import {
  ArrowTopRightIcon,
  Button,
  Card,
  CloseIcon,
  Flex,
  IconFrame,
  ListBoxItem,
  Select,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import chroma from 'chroma-js'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body1P, Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { WorkbenchJobCreateInput } from 'components/workbenches/workbench/WorkbenchJobCreateInput'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  FlowBasicWithBindingsFragment,
  useCancelWorkbenchJobMutation,
  useFlowWorkbenchesQuery,
  useWorkbenchJobQuery,
  WorkbenchJob,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'

export function FlowWorkbenchJobLauncher({
  flow,
}: {
  flow: FlowBasicWithBindingsFragment
}) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { data, loading, error } = useFlowWorkbenchesQuery({
    variables: { id: flow.id },
    skip: !flow.id || !open,
  })

  const workbenches = useMemo(
    () => (data?.flow?.workbenches ?? []).filter(isNonNullable),
    [data?.flow?.workbenches]
  )
  const toggle = useCallback(() => setOpen((open) => !open), [])

  const transitions = useTransition(open ? [true] : [], {
    from: { opacity: 0, scale: 0.65 },
    enter: { opacity: 1, scale: 1 },
    leave: { opacity: 0, scale: 0.65 },
    config: { tension: 1000, friction: 55 },
  })

  useKeyDown(['Escape'], () => setOpen(false))
  useClickOutside(ref, () => setOpen(false))

  return (
    <div
      ref={ref}
      css={{ position: 'relative', zIndex: theme.zIndexes.modal }}
    >
      <Button onClick={toggle}>Start workbench job</Button>
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <FlowWorkbenchJobPanel
            flow={flow}
            workbenches={workbenches}
            workbenchesLoading={loading && !data}
            workbenchesError={error}
            onClose={() => setOpen(false)}
          />
        </AnimatedWrapperSC>
      ))}
    </div>
  )
}

function FlowWorkbenchJobPanel({
  flow,
  workbenches,
  workbenchesLoading,
  workbenchesError,
  onClose,
}: {
  flow: FlowBasicWithBindingsFragment
  workbenches: WorkbenchTinyFragment[]
  workbenchesLoading: boolean
  workbenchesError: Nullable<Error>
  onClose: () => void
}) {
  const theme = useTheme()
  const [selectedWorkbenchId, setSelectedWorkbenchId] = useState('')
  const [createdJob, setCreatedJob] = useState<Nullable<WorkbenchJob>>(null)

  const selectedWorkbench = useMemo(
    () => workbenches.find((workbench) => workbench.id === selectedWorkbenchId),
    [selectedWorkbenchId, workbenches]
  )

  useEffect(() => {
    if (selectedWorkbenchId && selectedWorkbench) return
    setSelectedWorkbenchId(workbenches[0]?.id ?? '')
  }, [selectedWorkbench, selectedWorkbenchId, workbenches])

  return (
    <Card
      fillLevel={1}
      css={{
        border: theme.borders.input,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        padding: theme.spacing.large,
        width: 568,
      }}
    >
      <Flex
        align="center"
        gap="small"
      >
        <WorkbenchIcon color="icon-light" />
        <Body1P
          $color="text-light"
          css={{ flexGrow: 1 }}
        >
          {`Send "${flow.name}" to Workbench job`}
        </Body1P>
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
          tooltip="Close"
        />
      </Flex>
      <PanelContentSC>
        {workbenchesError && <GqlError error={workbenchesError} />}
        {createdJob ? (
          <CreatedWorkbenchJobContent
            initialJob={createdJob}
            workbenchId={selectedWorkbenchId}
          />
        ) : (
          <>
            <Flex
              direction="column"
              gap="small"
            >
              <Body2BoldP $color="text">Select workbench</Body2BoldP>
              <Select
                selectedKey={selectedWorkbenchId}
                isDisabled={!workbenchesLoading && !workbenches.length}
                label={
                  workbenchesLoading ? (
                    <RectangleSkeleton $width="100%" />
                  ) : (
                    selectedWorkbench?.name || 'No workbenches attached'
                  )
                }
                onSelectionChange={(key) =>
                  key && setSelectedWorkbenchId(`${key}`)
                }
              >
                {workbenches.map((workbench) => (
                  <ListBoxItem
                    key={workbench.id}
                    label={workbench.name}
                    textValue={workbench.name}
                  />
                ))}
              </Select>
            </Flex>
            {/* <Flex
              direction="column"
              gap="small"
            >
              <Body2BoldP $color="text">Flow context</Body2BoldP>
              <FlowContextSC />
            </Flex> */}
            <WorkbenchJobCreateInput
              workbenchId={selectedWorkbenchId}
              workbenchLoading={workbenchesLoading}
              disabled={!selectedWorkbenchId}
              onCreated={setCreatedJob}
              placeholder="Start typing your question here..."
              wrapperStyles={{ minHeight: 140, maxWidth: '100%' }}
            />
          </>
        )}
      </PanelContentSC>
    </Card>
  )
}

function CreatedWorkbenchJobContent({
  initialJob,
  workbenchId,
}: {
  initialJob: WorkbenchJob
  workbenchId: string
}) {
  const { data, startPolling, stopPolling } = useWorkbenchJobQuery({
    variables: { id: initialJob.id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !initialJob.id,
    notifyOnNetworkStatusChange: true,
  })

  const job = data?.workbenchJob ?? initialJob
  const cancellable = isJobRunning(job.status)

  useEffect(() => {
    if (cancellable) startPolling(POLL_INTERVAL)
    else stopPolling()
    return () => stopPolling()
  }, [cancellable, startPolling, stopPolling])

  const [cancelWorkbenchJob, { loading, error }] =
    useCancelWorkbenchJobMutation({
      variables: { jobId: job.id },
      awaitRefetchQueries: true,
      refetchQueries: ['WorkbenchJob'],
    })

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {error && <GqlError error={error} />}
      <StartedJobCardSC>
        <IconFrame
          type="secondary"
          icon={<WorkbenchIcon color="icon-light" />}
          css={{ borderRadius: '50%' }}
        />
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
          to={getWorkbenchJobAbsPath({ workbenchId, jobId: job.id })}
          endIcon={<ArrowTopRightIcon />}
        >
          See progress
        </Button>
      </Flex>
    </Flex>
  )
}

const AnimatedWrapperSC = styled(animated.div)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 32 + theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 160px)',
  overflow: 'visible',
  transformOrigin: 'top right',
}))

const PanelContentSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  marginTop: theme.spacing.medium,
  minHeight: 0,
  overflow: 'visible',
}))

const StartedJobCardSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
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
    background: `linear-gradient(315deg, ${chroma('#5C77FF').alpha(0).hex()} 0%, #494FF2 46%, ${chroma('#8FD6FF').alpha(0.6).hex()} 79%, ${chroma('#52F4D9').alpha(0.5).hex()} 100%)`,
    pointerEvents: 'none',
    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  },
}))

// const FlowContextSC = styled.div(({ theme }) => ({
//   height: 120,
//   maxHeight: 120,
//   overflowY: 'auto',
//   border: theme.borders.input,
//   borderRadius: theme.borderRadiuses.medium,
//   backgroundColor: theme.colors['fill-zero-selected'],
//   padding: theme.spacing.medium,
// }))
