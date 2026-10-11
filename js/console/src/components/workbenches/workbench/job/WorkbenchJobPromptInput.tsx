import {
  useCancelWorkbenchJobMutation,
  useCreateQueuedPromptMutation,
  useWorkbenchQuery,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobModelAttributes,
  WorkbenchJobModesAttributes,
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
import {
  queuedPromptsFromJob,
  WorkbenchJobPromptQueue,
} from './WorkbenchJobPromptQueue'
import { WorkbenchModelSelector } from '../WorkbenchModelSelector'
import {
  WorkbenchPromptCancelButton,
  WorkbenchPromptOptionsGroup,
  WorkbenchPromptSubmitButton,
} from '../WorkbenchPromptControls'
import {
  WorkbenchPromptOptionPills,
  WorkbenchPromptOptionsSelector,
} from '../WorkbenchPromptModeSelector/WorkbenchPromptOptionsSelector'
import {
  defaultPromptModesFromWorkbench,
  modesAttributes,
  modesFormValue,
} from '../WorkbenchPromptModeSelector/workbenchPromptModes'

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
  const [promptModes, setPromptModes] =
    useState<WorkbenchJobModesAttributes | null>(null)
  const [selectedModel, setSelectedModel] =
    useState<WorkbenchJobModelAttributes | null>(null)
  const chatInputRef = useRef<ChatInputSimpleRef>(null)
  const queuedPrompts = queuedPromptsFromJob(job)
  const workbenchId = job?.workbench?.id
  const { data: workbenchData } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const effectivePromptModes =
    promptModes ??
    modesAttributes(modesFormValue(job?.modes)) ??
    defaultPromptModesFromWorkbench(
      workbenchData?.workbench,
      workbenchId ?? null
    ) ??
    null

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

  const canCancel =
    job?.status === WorkbenchJobStatus.Pending ||
    job?.status === WorkbenchJobStatus.Running
  const submitLoading = createQueuedLoading
  const submitError = createQueuedError

  const submitJob = () => {
    if (!job?.id || !newMessage) return

    const promptModeAttributes = modesAttributes(effectivePromptModes)
    const modes =
      promptModeAttributes || selectedModel
        ? {
            ...(promptModeAttributes ?? {}),
            ...(selectedModel ? { model: selectedModel } : {}),
          }
        : undefined

    createQueuedPrompt({
      variables: {
        jobId: job.id,
        attributes: {
          prompt: newMessage,
          dequeableAt: new Date().toISOString(),
          ...(modes ? { modes } : {}),
        },
      },
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
          options={
            <WorkbenchPromptOptionsGroup>
              <WorkbenchPromptOptionsSelector
                workbenchId={workbenchId}
                value={effectivePromptModes}
                onChange={setPromptModes}
                disabled={!job || submitLoading}
                workbenchModes={workbenchData?.workbench?.modes}
              />
              <WorkbenchModelSelector
                value={selectedModel}
                onChange={(model) => setSelectedModel(model ?? null)}
                disabled={!job || submitLoading}
              />
              <WorkbenchPromptOptionPills
                value={effectivePromptModes}
                onChange={setPromptModes}
              />
            </WorkbenchPromptOptionsGroup>
          }
          submitButton={
            canCancel ? (
              <Tooltip label="Cancel job">
                <WorkbenchPromptCancelButton
                  onClick={() => setCancelModalOpen(true)}
                />
              </Tooltip>
            ) : (
              <WorkbenchPromptSubmitButton
                loading={submitLoading}
                disabled={!job || !newMessage || submitLoading}
                onClick={submitJob}
              />
            )
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
