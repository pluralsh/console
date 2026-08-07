import {
  useCancelWorkbenchJobMutation,
  useCreateQueuedPromptMutation,
  useCreateWorkbenchMessageMutation,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { useRef, useState } from 'react'

import { Tooltip } from '@pluralsh/design-system'
import {
  ChatInputSimple,
  ChatInputSimpleRef,
} from 'components/ai/chatbot/input/ChatInput'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import styled from 'styled-components'
import { appendActivityToCache } from './useWorkbenchJobStreams'
import { isJobRunning } from './WorkbenchJobActivity'
import {
  queuedPromptsFromJob,
  WorkbenchJobPromptQueue,
} from './WorkbenchJobPromptQueue'

const QUEUE_REFETCH_QUERIES = [
  'WorkbenchJobActivities',
  'WorkbenchJob',
  'WorkbenchJobs',
]

export function WorkbenchJobPromptInput({
  job,
}: {
  job: Nullable<WorkbenchJobActivitiesQuery['workbenchJob']>
}) {
  const [newMessage, setNewMessage] = useState('')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const chatInputRef = useRef<ChatInputSimpleRef>(null)
  const queuedPrompts = queuedPromptsFromJob(job)

  const [
    createMessage,
    { loading: createMessageLoading, error: createMessageError },
  ] = useCreateWorkbenchMessageMutation({
    update: (cache, { data }) =>
      appendActivityToCache(cache, job?.id ?? '', data?.createWorkbenchMessage),
    onCompleted: () => chatInputRef.current?.resetInput?.(),
    refetchQueries: ['WorkbenchJob'],
  })

  const [
    createQueuedPrompt,
    { loading: createQueuedLoading, error: createQueuedError },
  ] = useCreateQueuedPromptMutation({
    onCompleted: () => chatInputRef.current?.resetInput?.(),
    refetchQueries: QUEUE_REFETCH_QUERIES,
  })

  const [cancelWorkbenchJob, { loading: cancelLoading, error: cancelError }] =
    useCancelWorkbenchJobMutation({
      awaitRefetchQueries: true,
      refetchQueries: QUEUE_REFETCH_QUERIES,
      onCompleted: () => setCancelModalOpen(false),
    })

  const isRunning = isJobRunning(job?.status)
  const canCancel =
    job?.status === WorkbenchJobStatus.Pending ||
    job?.status === WorkbenchJobStatus.Running
  const submitLoading = createMessageLoading || createQueuedLoading
  const submitError = createMessageError || createQueuedError

  const submitJob = () => {
    if (!job?.id || !newMessage) return

    if (isRunning) {
      createQueuedPrompt({
        variables: {
          jobId: job.id,
          attributes: {
            prompt: newMessage,
            dequeableAt: new Date().toISOString(),
          },
        },
      })
      return
    }

    createMessage({
      variables: { jobId: job.id, attributes: { prompt: newMessage } },
    })
  }

  const hasQueue = queuedPrompts.length > 0

  return (
    <>
      {submitError && <GqlError error={submitError} />}
      <PromptComposerSC $hasQueue={hasQueue}>
        <WorkbenchJobPromptQueue prompts={queuedPrompts} />
        <ChatInputSimple
          ref={chatInputRef}
          disabled={!job}
          placeholder="Send an additional message to this job"
          loading={submitLoading}
          setValue={setNewMessage}
          onSubmit={submitJob}
          allowSubmit={!!newMessage}
          wrapperStyles={{
            minHeight: 90,
            ...(hasQueue
              ? {
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                }
              : {}),
          }}
          enableAutoComplete
          workbenchId={job?.workbench?.id}
          workbenchRepositorySource={job?.workbench}
          submitButton={
            canCancel ? (
              <Tooltip label="Cancel job">
                <CancelSquareButtonSC
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                >
                  <CancelSquareIconSC />
                </CancelSquareButtonSC>
              </Tooltip>
            ) : undefined
          }
        />
      </PromptComposerSC>
      <Confirm
        open={cancelModalOpen}
        close={() => setCancelModalOpen(false)}
        destructive
        label="Cancel job"
        loading={cancelLoading}
        error={cancelError}
        submit={() =>
          cancelWorkbenchJob({ variables: { jobId: job?.id ?? '' } })
        }
        title="Cancel job"
        text="Are you sure you want to cancel this job?"
      />
    </>
  )
}

const PromptComposerSC = styled.div<{ $hasQueue: boolean }>(
  ({ theme, $hasQueue }) => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ...($hasQueue
      ? {
          // Keep the stacked queue + input reading as one control.
          marginTop: theme.spacing.xsmall,
        }
      : {}),
  })
)

const CancelSquareButtonSC = styled.button(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing.small,
  right: theme.spacing.small,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 28,
  width: 28,
  minHeight: 0,
  borderRadius: 25,
  border: 'none',
  background: theme.colors['fill-two'],
  cursor: 'pointer',
  '&:hover': { background: theme.colors['fill-three'] },
}))

const CancelSquareIconSC = styled.div(({ theme }) => ({
  height: 10,
  width: 10,
  borderRadius: 2,
  background: theme.colors['icon-light'],
  flexShrink: 0,
}))
