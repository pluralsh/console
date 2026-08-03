import { Card, IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { GqlError } from 'components/utils/Alert'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  QueuedPromptTinyFragment,
  useDeleteQueuedPromptMutation,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

const QUEUE_REFETCH_QUERIES = [
  'WorkbenchJobActivities',
  'WorkbenchJob',
  'WorkbenchJobs',
]

function isReadyPrompt(prompt: QueuedPromptTinyFragment, now = dayjs()) {
  return !prompt.dequeableAt || !dayjs(prompt.dequeableAt).isAfter(now)
}

function formatQueuedAt(date?: Nullable<string>) {
  if (!date) return 'Queued'
  return `Queued ${dayjs(date).format('h:mm A')}`
}

function formatPendingReadyAt(date?: Nullable<string>) {
  if (!date) return ''
  const d = dayjs(date)
  const now = dayjs()

  if (d.isSame(now.add(1, 'day'), 'day'))
    return `Tomorrow ${d.format('h:mm A')} ·`

  const days = d.startOf('day').diff(now.startOf('day'), 'day')
  if (days >= 2 && days <= 6) {
    const label = d.fromNow()
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} ·`
  }

  if (d.isSame(now, 'year')) return `${d.format('MMM D, h:mm A')} ·`
  return `${d.format('MMM D, YYYY h:mm A')} ·`
}

function formatNextDeferredLabel(date?: Nullable<string>) {
  if (!date) return null
  const d = dayjs(date)
  const mins = Math.max(1, Math.round(d.diff(dayjs(), 'minute', true)))
  if (mins < 60) return `Next deferred prompt runs in ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `Next deferred prompt runs in ${hours} hr`
  return `Next deferred prompt runs ${d.fromNow()}`
}

export function WorkbenchJobPromptQueue({
  prompts,
}: {
  prompts: QueuedPromptTinyFragment[]
}) {
  const theme = useTheme()
  const [deleteQueuedPrompt, { loading: deleteLoading, error: deleteError }] =
    useDeleteQueuedPromptMutation({
      refetchQueries: QUEUE_REFETCH_QUERIES,
    })

  const { ready, pending, nextDeferredAt } = useMemo(() => {
    const now = dayjs()
    const readyPrompts: QueuedPromptTinyFragment[] = []
    const pendingPrompts: QueuedPromptTinyFragment[] = []

    for (const prompt of prompts) {
      if (isReadyPrompt(prompt, now)) readyPrompts.push(prompt)
      else pendingPrompts.push(prompt)
    }

    return {
      ready: readyPrompts,
      pending: pendingPrompts,
      nextDeferredAt: pendingPrompts[0]?.dequeableAt,
    }
  }, [prompts])

  if (isEmpty(prompts)) return null

  const nextDeferredLabel = formatNextDeferredLabel(nextDeferredAt)

  return (
    <QueueCardSC>
      {deleteError && <GqlError error={deleteError} />}
      <SimpleAccordion
        defaultOpen
        caret="right"
        triggerWrapperStyles={{
          width: '100%',
          '.icon': { width: 10, color: theme.colors['icon-xlight'] },
        }}
        trigger={
          <QueueHeaderSC>
            <Body2P $color="text-primary-disabled">
              {prompts.length} Queued
            </Body2P>
            {nextDeferredLabel && (
              <Body2P $color="text-primary-disabled">
                {nextDeferredLabel}
              </Body2P>
            )}
          </QueueHeaderSC>
        }
      >
        <QueueBodySC>
          {!isEmpty(ready) && (
            <QueueSectionSC>
              <Body2P
                $color="text-success-light"
                css={{ letterSpacing: '0.5px' }}
              >
                {ready.length} Ready
              </Body2P>
              {ready.map((prompt) => (
                <QueueItem
                  key={prompt.id}
                  prompt={prompt}
                  meta={formatQueuedAt(prompt.insertedAt)}
                  deleteLoading={deleteLoading}
                  onDelete={() =>
                    deleteQueuedPrompt({ variables: { id: prompt.id } })
                  }
                />
              ))}
            </QueueSectionSC>
          )}
          {!isEmpty(pending) && (
            <QueueSectionSC>
              <Body2P
                $color="text-light"
                css={{ letterSpacing: '0.5px' }}
              >
                {pending.length} Pending
              </Body2P>
              {pending.map((prompt) => (
                <QueueItem
                  key={prompt.id}
                  prompt={prompt}
                  meta={formatPendingReadyAt(prompt.dequeableAt)}
                  deleteLoading={deleteLoading}
                  onDelete={() =>
                    deleteQueuedPrompt({ variables: { id: prompt.id } })
                  }
                />
              ))}
            </QueueSectionSC>
          )}
        </QueueBodySC>
      </SimpleAccordion>
    </QueueCardSC>
  )
}

function QueueItem({
  prompt,
  meta,
  deleteLoading,
  onDelete,
}: {
  prompt: QueuedPromptTinyFragment
  meta: string
  deleteLoading: boolean
  onDelete: () => void
}) {
  return (
    <QueueItemSC>
      <QueueItemContentSC>
        <Body2P
          $color="text-light"
          css={{ ...TRUNCATE, width: '100%', letterSpacing: '0.5px' }}
        >
          {prettifyPrompt(prompt.prompt ?? '')}
        </Body2P>
        <MetaRowSC>
          {meta && <CaptionP $color="text-input-disabled">{meta}</CaptionP>}
          {prompt.user?.name && (
            <CaptionP $color="text-input-disabled">{prompt.user.name}</CaptionP>
          )}
        </MetaRowSC>
      </QueueItemContentSC>
      <DeleteButtonSC
        clickable
        size="small"
        tooltip="Remove"
        disabled={deleteLoading}
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete()
        }}
      />
    </QueueItemSC>
  )
}

export function queuedPromptsFromJob(
  job: Nullable<{
    queuedPrompts?: Nullable<{
      edges?: Nullable<
        Array<Nullable<{ node?: Nullable<QueuedPromptTinyFragment> }>>
      >
    }>
  }>
) {
  return (
    job?.queuedPrompts?.edges
      ?.map((edge) => edge?.node)
      .filter(isNonNullable) ?? []
  )
}

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
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px ${theme.spacing.small}px`,
}))

const QueueHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  width: '100%',
  minWidth: 0,
}))

const QueueBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  paddingTop: theme.spacing.xsmall,
}))

const QueueSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const DeleteButtonSC = styled(IconFrame)({
  opacity: 0,
  pointerEvents: 'none',
  flexShrink: 0,
})

const QueueItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.medium,
  margin: `0 -${theme.spacing.xsmall}px`,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
  '&:hover': {
    backgroundColor: theme.colors['fill-two-hover'],
  },
  [`&:hover ${DeleteButtonSC}`]: {
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

const MetaRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))
