import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  ChatFilledIcon,
  ChatOutlineIcon,
  Chip,
  Flex,
  IconFrame,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
} from '@pluralsh/design-system'

import { StackedText } from 'components/utils/table/StackedText'

import { CaptionP } from 'components/utils/typography/Text'

import { MoreMenuTrigger } from 'components/utils/MoreMenu.tsx'
import {
  AiInsightFragment,
  AiInsightSummaryFragment,
  AiPinFragment,
  ChatThreadTinyFragment,
} from 'generated/graphql'
import { Dispatch, ReactElement, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime.ts'
import { useChatbot } from './AIContext.tsx'
import { AiThreadsTableActions } from './AiThreadsTableActions'
import { ClusterProviderIcon } from '../utils/Provider.tsx'
import { StackTypeIcon } from '../stacks/common/StackTypeIcon.tsx'

export function AIThreadsTableEntry({
  item,
  onClickPin,
  pinLoading,
  modal,
}: {
  item: ChatThreadTinyFragment | AiPinFragment
  onClickPin?: () => void
  pinLoading?: boolean
  modal?: boolean | null
}) {
  const isPin = item.__typename === 'AiPin'
  const isInsight = isPin && !item.thread
  const thread = isPin ? item.thread : (item as ChatThreadTinyFragment)

  return isInsight ? (
    <InsightEntry
      insight={item.insight}
      modal={modal}
      isPin={isPin}
      pinLoading={pinLoading}
      onClickPin={onClickPin}
    />
  ) : (
    <ThreadEntry
      thread={thread}
      modal={modal}
      isPin={isPin}
      pinLoading={pinLoading}
      onClickPin={onClickPin}
      actions={<AiThreadsTableActions thread={thread} />}
    />
  )
}

const TableEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xlarge,
  height: '100%',
  width: '100%',
  background: theme.colors['fill-one'],
  padding: theme.spacing.medium,
  '&:not(:has(button:hover))': {
    '&:hover': {
      background: theme.colors['fill-two-selected'],
      cursor: 'pointer',
    },
  },
}))

function TableEntry({
  onClick,
  icon,
  title,
  subtitle,
  timestamp,
  stale,
  onClickPin,
  pinLoading,
  pinned,
  modal,
  actions,
}: {
  onClick: Dispatch<void>
  icon: ReactElement
  title: string
  subtitle?: Nullable<string>
  timestamp?: string
  stale?: boolean
  onClickPin?: Dispatch<void>
  pinLoading?: boolean
  pinned?: boolean
  actions?: ReactNode
  modal?: Nullable<boolean>
}): ReactNode {
  const theme = useTheme()

  return (
    <TableEntrySC
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
    >
      <Flex
        gap="small"
        flex={1}
      >
        <IconFrame
          type="floating"
          icon={icon}
        />
        <StackedText
          css={{ maxWidth: '450px', color: theme.colors['text'] }}
          truncate
          first={title}
          second={subtitle}
          firstPartialType="body1Bold"
        />
      </Flex>
      <CaptionP css={{ opacity: stale ? 0.6 : 1 }}>
        {dayjs(timestamp).fromNow()}
      </CaptionP>
      {!modal && (
        <>
          <Chip severity={stale ? 'neutral' : 'success'}>
            {stale ? 'Stale' : 'Active'}
          </Chip>
          <IconFrame
            clickable
            onClick={(e) => {
              e.stopPropagation()
              onClickPin?.()
            }}
            icon={
              pinLoading ? (
                <Spinner />
              ) : pinned ? (
                <PushPinFilledIcon color={theme.colors['icon-info']} />
              ) : (
                <PushPinOutlineIcon />
              )
            }
          />
        </>
      )}
      {actions}
    </TableEntrySC>
  )
}

function InsightEntry({
  insight,
  isPin,
  pinLoading,
  onClickPin,
  modal,
}: {
  insight: Nullable<AiInsightFragment>
  modal: Nullable<boolean>
  isPin: boolean
  pinLoading?: boolean
  onClickPin?: Dispatch<void>
}) {
  const { goToInsight } = useChatbot()
  const theme = useTheme()
  const timestamp = insight?.updatedAt || insight?.insertedAt || dayjs().toNow()
  const isStale = dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))
  const icon = isStale ? (
    <AiSparkleOutlineIcon color={theme.colors['icon-light']} />
  ) : (
    <AiSparkleFilledIcon color={theme.colors['icon-info']} />
  )

  if (!insight) return null

  return (
    <TableEntry
      onClick={() => goToInsight(insight)}
      icon={icon}
      title={insight.summary?.substring(0, 250) ?? ''}
      subtitle={getInsightResourceName(insight)}
      timestamp={timestamp}
      pinned={isPin}
      pinLoading={pinLoading}
      onClickPin={() => {
        if (pinLoading) return
        onClickPin?.()
      }}
      stale={isStale}
      modal={modal}
      actions={
        <MoreMenuTrigger
          disabled
          css={{ cursor: 'default' }}
        />
      }
    />
  )
}

function ThreadEntry({
  thread,
  isPin,
  pinLoading,
  onClickPin,
  modal,
  actions,
}: {
  thread: Nullable<ChatThreadTinyFragment>
  isPin: boolean
  pinLoading?: boolean
  onClickPin?: Dispatch<void>
  modal: Nullable<boolean>
  actions: ReactNode
}): ReactNode {
  const { goToThread } = useChatbot()
  const theme = useTheme()
  const timestamp =
    thread?.lastMessageAt ||
    thread?.updatedAt ||
    thread?.insertedAt ||
    dayjs().toNow()
  const isStale = dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))
  const icon = isStale ? (
    <ChatOutlineIcon color={theme.colors['icon-light']} />
  ) : (
    <ChatFilledIcon color={theme.colors['icon-info']} />
  )

  if (!thread) return null

  return (
    <TableEntry
      onClick={() => goToThread(thread)}
      icon={icon}
      title={thread.summary}
      subtitle={getInsightResourceName(thread.insight)}
      timestamp={timestamp}
      pinned={isPin}
      pinLoading={pinLoading}
      onClickPin={() => {
        if (pinLoading) return
        onClickPin?.()
      }}
      stale={isStale}
      modal={modal}
      actions={actions}
    />
  )
}

export const getInsightResourceName = (
  insight: Nullable<AiInsightSummaryFragment>
): Nullable<string> =>
  insight?.cluster?.name ||
  insight?.clusterInsightComponent?.name ||
  insight?.service?.name ||
  insight?.serviceComponent?.name ||
  insight?.stack?.name ||
  insight?.stackRun?.message

function TableEntryIcon(
  isInsight: boolean,
  isStale: boolean,
  insight: Nullable<AiInsightSummaryFragment>
): ReactNode {
  if (!!insight?.cluster)
    return <ClusterProviderIcon cluster={insight.cluster} />

  if (!!insight?.service)
    return <ClusterProviderIcon cluster={insight.service.cluster} />

  if (!!insight?.serviceComponent)
    return (
      <ClusterProviderIcon
        cluster={insight.serviceComponent.service?.cluster}
      />
    )

  if (!!insight?.stack) return <StackTypeIcon stackType={insight.stack.type} />

  if (!!insight?.stackRun)
    return <StackTypeIcon stackType={insight.stackRun.type} />

  //   insight?.clusterInsightComponent?.name ||

  return <div>-</div>
}
