import {
  useCancelWorkbenchJobMutation,
  useCreateWorkbenchMessageMutation,
  WorkbenchJobActivitiesQuery,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import {
  Card,
  CircleDashIcon,
  IconFrame,
  Tooltip,
  TrashCanIcon,
  usePrevious,
} from '@pluralsh/design-system'
import {
  ChatInputSimple,
  ChatInputSimpleRef,
} from 'components/ai/chatbot/input/ChatInput'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import { isEmpty } from 'lodash'
import styled from 'styled-components'
import { appendActivityToCache } from './useWorkbenchJobStreams'
import { isJobRunning } from './WorkbenchJobActivity'

export function WorkbenchJobPromptInput({
  job,
}: {
  job: Nullable<WorkbenchJobActivitiesQuery['workbenchJob']>
}) {
  const [newMessage, setNewMessage] = useState('')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const chatInputRef = useRef<ChatInputSimpleRef>(null)
  const [chatQueue, setChatQueue] = useState<{ id: string; message: string }[]>(
    []
  )

  const [
    createMessage,
    { loading: createMessageLoading, error: createMessageError },
  ] = useCreateWorkbenchMessageMutation({
    update: (cache, { data }) =>
      appendActivityToCache(cache, job?.id ?? '', data?.createWorkbenchMessage),
    onCompleted: () => chatInputRef.current?.resetInput?.(),
    refetchQueries: ['WorkbenchJob'],
  })

  const [cancelWorkbenchJob, { loading: cancelLoading, error: cancelError }] =
    useCancelWorkbenchJobMutation({
      awaitRefetchQueries: true,
      refetchQueries: [
        'WorkbenchJob',
        'WorkbenchJobs',
        'WorkbenchJobActivities',
      ],
      onCompleted: () => setCancelModalOpen(false),
    })

  const isRunning = isJobRunning(job?.status)
  const prevIsRunning = usePrevious(isRunning)
  const canCancel =
    job?.status === WorkbenchJobStatus.Pending ||
    job?.status === WorkbenchJobStatus.Running

  const submitJob = () => {
    if (isRunning) {
      setChatQueue((prev) => [
        ...prev,
        { id: Math.random().toString(), message: newMessage },
      ])
      chatInputRef.current?.resetInput?.()
    } else
      createMessage({
        variables: { jobId: job?.id ?? '', attributes: { prompt: newMessage } },
      })
  }

  const sendTopQueueMessage = useEffectEvent(() => {
    if (isEmpty(chatQueue)) return
    createMessage({
      variables: {
        jobId: job?.id ?? '',
        attributes: { prompt: chatQueue[0].message },
      },
    })
    setChatQueue((prev) => prev.slice(1))
  })
  useEffect(() => {
    if (prevIsRunning && !isRunning) sendTopQueueMessage()
  }, [isRunning, prevIsRunning])

  return (
    <>
      {createMessageError && <GqlError error={createMessageError} />}
      <div css={{ position: 'relative' }}>
        {!isEmpty(chatQueue) && (
          <QueueCardSC>
            <SimpleAccordion
              defaultOpen
              trigger={
                <Body2P $color="text-primary-disabled">{`${chatQueue.length} Queued`}</Body2P>
              }
              caret="right-quarter-mirror"
              triggerWrapperStyles={{
                justifyContent: 'flex-start',
                '.icon': { width: 10 },
              }}
            >
              {chatQueue.map(({ id, message }) => (
                <QueueItemSC key={id}>
                  <CircleDashIcon
                    size={14}
                    color="icon-light"
                  />
                  <Body2P
                    $color="text-light"
                    css={{ ...TRUNCATE, flex: 1 }}
                  >
                    {prettifyPrompt(message)}
                  </Body2P>
                  <IconFrame
                    clickable
                    size="small"
                    tooltip="Remove"
                    icon={<TrashCanIcon color="icon-danger" />}
                    onClick={() =>
                      setChatQueue(chatQueue.filter((m) => m.id !== id))
                    }
                  />
                </QueueItemSC>
              ))}
            </SimpleAccordion>
          </QueueCardSC>
        )}
        <ChatInputSimple
          ref={chatInputRef}
          disabled={!job}
          placeholder="Send an additional message to this job"
          loading={createMessageLoading}
          setValue={setNewMessage}
          onSubmit={submitJob}
          allowSubmit={!!newMessage}
          wrapperStyles={{ minHeight: 90 }}
          enableAutoComplete
          workbenchId={job?.workbench?.id}
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
      </div>
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

const QueueItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  paddingTop: theme.spacing.xsmall,
}))

const QueueCardSC = styled(Card)(({ theme }) => ({
  position: 'absolute',
  bottom: '100%',
  left: theme.spacing.medium,
  right: theme.spacing.medium,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  border: theme.borders['fill-three'],
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottom: 'none',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))
