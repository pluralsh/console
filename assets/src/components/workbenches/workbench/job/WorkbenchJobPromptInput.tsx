import {
  useCreateWorkbenchMessageMutation,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

import {
  Card,
  CircleDashIcon,
  IconFrame,
  TrashCanIcon,
  usePrevious,
} from '@pluralsh/design-system'
import {
  ChatInputSimple,
  ChatInputSimpleRef,
} from 'components/ai/chatbot/input/ChatInput'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { GqlError } from 'components/utils/Alert'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import { isEmpty } from 'lodash'
import styled from 'styled-components'
import { appendActivityToCache } from './useWorkbenchJobStreams'
import { isJobRunning } from './WorkbenchJobActivity'

export function WorkbenchJobPromptInput({
  job,
}: {
  job: Nullable<WorkbenchJobFragment>
}) {
  const [newMessage, setNewMessage] = useState('')
  const chatInputRef = useRef<ChatInputSimpleRef>(null)
  const [chatQueue, setChatQueue] = useState<{ id: string; message: string }[]>(
    []
  )

  const resetInput = () => {
    setNewMessage('')
    chatInputRef.current?.resetInput?.()
  }
  const [
    createMessage,
    { loading: createMessageLoading, error: createMessageError },
  ] = useCreateWorkbenchMessageMutation({
    variables: { jobId: job?.id ?? '', attributes: { prompt: newMessage } },
    update: (cache, { data }) =>
      appendActivityToCache(cache, job?.id ?? '', data?.createWorkbenchMessage),
    onCompleted: () => resetInput(),
    refetchQueries: ['WorkbenchJob'],
  })

  const isRunning = isJobRunning(job?.status)
  const prevIsRunning = usePrevious(isRunning)

  const submitJob = () => {
    if (isRunning) {
      setChatQueue((prev) => [
        ...prev,
        { id: Math.random().toString(), message: newMessage },
      ])
      resetInput()
    } else createMessage()
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
                    {message}
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
        />
      </div>
    </>
  )
}

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
