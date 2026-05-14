import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import {
  ArrowTopRightIcon,
  Button,
  Card,
  CloseIcon,
  Flex,
  IconFrame,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import chroma from 'chroma-js'
import { ChatInputSimple } from 'components/ai/chatbot/input/ChatInput'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { Body1P, Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  useCancelWorkbenchJobMutation,
  useWorkbenchEvalSkillMutation,
  useWorkbenchJobQuery,
} from 'generated/graphql'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'

type WorkbenchEvalSkillButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'loading' | 'onClick'
> & {
  evalResultId?: Nullable<string>
  workbenchId: string
}

export function WorkbenchEvalSkillButton({
  evalResultId,
  workbenchId,
  disabled,
  ...props
}: WorkbenchEvalSkillButtonProps) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const lastEvalResultIdRef = useRef<Nullable<string>>(evalResultId ?? null)
  const { popToast } = useSimpleToast()
  const [open, setOpen] = useState(false)
  const [additionalInformation, setAdditionalInformation] = useState('')
  const [createdJobId, setCreatedJobId] = useState<Nullable<string>>(null)

  const [workbenchEvalSkill, { loading }] = useWorkbenchEvalSkillMutation({
    onCompleted: ({ workbenchEvalSkill }) => {
      popToast({
        content: 'Skills updated successfully',
        severity: 'success',
      })
      setCreatedJobId(workbenchEvalSkill?.id ?? null)
    },
    onError: (e) => popToast({ content: e.message, severity: 'danger' }),
  })

  const toggle = useCallback(() => {
    if (!open && lastEvalResultIdRef.current !== (evalResultId ?? null)) {
      lastEvalResultIdRef.current = evalResultId ?? null
      setCreatedJobId(null)
      setAdditionalInformation('')
    }

    setOpen((open) => !open)
  }, [evalResultId, open])

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
      <Button
        disabled={disabled || !evalResultId}
        onClick={toggle}
        {...props}
      >
        Create skills from eval
      </Button>
      {transitions((styles) => (
        <AnimatedWrapperSC style={styles}>
          <WorkbenchEvalSkillPanel
            additionalInformation={additionalInformation}
            createdJobId={createdJobId}
            loading={loading}
            onAdditionalInformationChange={setAdditionalInformation}
            onClose={() => setOpen(false)}
            onSubmit={() => {
              if (!evalResultId || loading) return

              workbenchEvalSkill({
                variables: {
                  id: evalResultId,
                  prompt: additionalInformation.trim() || undefined,
                },
              })
            }}
            workbenchId={workbenchId}
          />
        </AnimatedWrapperSC>
      ))}
    </div>
  )
}

function WorkbenchEvalSkillPanel({
  additionalInformation,
  createdJobId,
  loading,
  onAdditionalInformationChange,
  onClose,
  onSubmit,
  workbenchId,
}: {
  additionalInformation: string
  createdJobId: Nullable<string>
  loading: boolean
  onAdditionalInformationChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  workbenchId: string
}) {
  const theme = useTheme()

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
          Update workbench skills
        </Body1P>
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
          tooltip="Close"
        />
      </Flex>
      <PanelContentSC>
        {createdJobId ? (
          <CreatedWorkbenchJobContent
            jobId={createdJobId}
            workbenchId={workbenchId}
          />
        ) : (
          <Flex
            direction="column"
            gap="large"
          >
            <ChatInputSimple
              placeholder="Add any additional information"
              setValue={onAdditionalInformationChange}
              initialValue={additionalInformation}
              onSubmit={onSubmit}
              loading={loading}
              allowSubmit={!!workbenchId}
              wrapperStyles={{ minHeight: 140, maxWidth: '100%' }}
            />
          </Flex>
        )}
      </PanelContentSC>
    </Card>
  )
}

function CreatedWorkbenchJobContent({
  jobId,
  workbenchId,
}: {
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

  const job = data?.workbenchJob
  const cancellable = job ? isJobRunning(job.status) : false

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
      {job ? (
        <StartedJobCardSC>
          <IconFrame
            type="secondary"
            icon={<WorkbenchIcon color="icon-light" />}
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
      ) : (
        <RectangleSkeleton
          $height={112}
          $width="100%"
        />
      )}
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
