import {
  ArrowUpIcon,
  Button,
  Flex,
  IconFrame,
  Input,
  PencilIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { ComposerShelfSC } from 'components/workbenches/common/ComposerShelf'
import { GqlError } from 'components/utils/Alert'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  DevboxQueuedPromptAction,
  DevboxThreadFragment,
  useUpdateDevboxQueuedPromptMutation,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { promptPreview } from './devboxThreads'

type QueuedPrompt = NonNullable<
  NonNullable<DevboxThreadFragment['queuedPrompts']>[number]
>

// prompts sent while the agent was busy, in the order they'll run
export function DevboxQueuedPrompts({
  thread,
  running,
}: {
  thread: DevboxThreadFragment
  running: boolean
}) {
  const theme = useTheme()
  const prompts = (thread.queuedPrompts ?? []).filter(isNonNullable)
  const [update, { loading, error }] = useUpdateDevboxQueuedPromptMutation()
  const [editing, setEditing] = useState<Nullable<string>>(null)

  if (!prompts.length) return null
  const act = (
    promptId: string,
    action: DevboxQueuedPromptAction,
    text?: string
  ) =>
    update({ variables: { id: thread.id, promptId, action, text } }).then(
      ({ errors }) => !errors?.length,
      () => false
    )

  return (
    <ComposerShelfSC>
      {error && (
        <QueueErrorSC>
          <GqlError error={error} />
        </QueueErrorSC>
      )}
      <SimpleAccordion
        defaultOpen
        caret="right"
        triggerWrapperStyles={{
          width: '100%',
          paddingRight: theme.spacing.medium,
          '.icon': { width: 10, color: theme.colors['icon-xlight'] },
        }}
        trigger={
          <QueueHeaderSC>
            <Body2P $color="text-primary-disabled">
              {prompts.length} Queued
            </Body2P>
            <Body2P $color="text-primary-disabled">
              {running ? 'Sent when the agent finishes' : 'Up next'}
            </Body2P>
          </QueueHeaderSC>
        }
      >
        <QueueBodySC>
          {prompts.map((prompt) =>
            editing === prompt.promptId ? (
              <QueueItemEditor
                key={prompt.promptId}
                prompt={prompt}
                loading={loading}
                onCancel={() => setEditing(null)}
                onSave={(text) =>
                  act(
                    prompt.promptId,
                    DevboxQueuedPromptAction.Edit,
                    text
                  ).then((ok) => ok && setEditing(null))
                }
              />
            ) : (
              <QueueItem
                key={prompt.promptId}
                prompt={prompt}
                loading={loading}
                running={running}
                onEdit={() => setEditing(prompt.promptId)}
                onSendNow={() =>
                  act(prompt.promptId, DevboxQueuedPromptAction.SendNow)
                }
                onRemove={() =>
                  act(prompt.promptId, DevboxQueuedPromptAction.Cancel)
                }
              />
            )
          )}
        </QueueBodySC>
      </SimpleAccordion>
    </ComposerShelfSC>
  )
}

function QueueItem({
  prompt,
  loading,
  running,
  onEdit,
  onSendNow,
  onRemove,
}: {
  prompt: QueuedPrompt
  loading: boolean
  running: boolean
  onEdit: () => void
  onSendNow: () => void
  onRemove: () => void
}) {
  const files = (prompt.attachments ?? []).filter(isNonNullable)
  const meta = [
    prompt.queuedAt ? `Queued ${dayjs(prompt.queuedAt).format('h:mm A')}` : '',
    files.length === 1 ? files[0] : files.length ? `${files.length} files` : '',
  ].filter(Boolean)
  return (
    <QueueItemSC>
      <QueueItemContentSC>
        <Body2P
          $color="text-light"
          css={{ ...TRUNCATE, width: '100%', letterSpacing: '0.025em' }}
        >
          {promptPreview(prompt.text ?? '') || 'Attachments only'}
        </Body2P>
        {!!meta.length && (
          <CaptionP $color="text-input-disabled">{meta.join(' · ')}</CaptionP>
        )}
      </QueueItemContentSC>
      <ActionsSC>
        <IconFrame
          clickable
          size="small"
          tooltip={running ? 'Stop the agent and send this now' : 'Send now'}
          disabled={loading}
          icon={<ArrowUpIcon />}
          onClick={onSendNow}
        />
        {!!prompt.text && (
          <IconFrame
            clickable
            size="small"
            tooltip="Edit"
            disabled={loading}
            icon={<PencilIcon />}
            onClick={onEdit}
          />
        )}
        <IconFrame
          clickable
          size="small"
          tooltip="Remove"
          disabled={loading}
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={onRemove}
        />
      </ActionsSC>
    </QueueItemSC>
  )
}

function QueueItemEditor({
  prompt,
  loading,
  onSave,
  onCancel,
}: {
  prompt: QueuedPrompt
  loading: boolean
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(prompt.text ?? '')
  const empty = !text.trim()
  return (
    <EditorSC
      onSubmit={(e) => {
        e.preventDefault()
        if (!empty) onSave(text)
      }}
    >
      <Input
        multiline
        minRows={2}
        maxRows={8}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && !e.shiftKey && !empty) {
            e.preventDefault()
            onSave(text)
          }
        }}
      />
      <Flex
        gap="small"
        justify="flex-end"
      >
        <Button
          small
          tertiary
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          small
          type="submit"
          loading={loading}
          disabled={empty}
        >
          Save
        </Button>
      </Flex>
    </EditorSC>
  )
}

const QueueErrorSC = styled.div(({ theme }) => ({
  padding: `0 ${theme.spacing.medium}`,
}))

const QueueHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  width: '100%',
  minWidth: 0,
  padding: `0 ${theme.spacing.medium}`,
}))

const QueueBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: `${theme.spacing.xsmall} ${theme.spacing.xsmall} 0`,
}))

const ActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  opacity: 0,
  pointerEvents: 'none',
}))

const QueueItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.medium,
  padding: `${theme.spacing.xxsmall} ${theme.spacing.xsmall}`,
  '&:hover, &:focus-within': {
    backgroundColor: theme.colors['fill-two-hover'],
  },
  [`&:hover ${ActionsSC}, &:focus-within ${ActionsSC}`]: {
    opacity: 1,
    pointerEvents: 'auto',
  },
}))

const QueueItemContentSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flex: 1,
  minWidth: 0,
})

const EditorSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.xsmall,
}))
