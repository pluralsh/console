import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  AppIcon,
  ArrowTopRightIcon,
  ChatFilledIcon,
  ChatOutlineIcon,
  Chip,
  Flex,
  FlowIcon,
  IconFrame,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
} from '@pluralsh/design-system'

import { StackedText } from 'components/utils/table/StackedText'

import { CaptionP } from 'components/utils/typography/Text'

import {
  AiInsightSummaryFragment,
  AiPinFragment,
  ChatThreadTinyFragment,
} from 'generated/graphql'
import { ComponentProps, ComponentPropsWithRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts.tsx'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs, fromNow, isAfter } from 'utils/datetime.ts'
import {
  getClusterDetailsPath,
  getServiceComponentPath,
  getServiceDetailsPath,
} from '../../routes/cdRoutesConsts.tsx'
import {
  getStackRunsAbsPath,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts.tsx'
import { StackTypeIcon } from '../stacks/common/StackTypeIcon.tsx'
import { MoreMenuTrigger } from '../utils/MoreMenu.tsx'
import { ClusterProviderIcon } from '../utils/Provider.tsx'
import { useChatbot } from './AIContext.tsx'
import { AITableActions } from './AITableActions.tsx'

const AIThreadsTableEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xlarge,
  height: '100%',
  width: '100%',
  background: theme.colors['fill-one'],
  padding: theme.spacing.medium,
  '&:not(:has(button:hover)):not(:has(a:hover))': {
    '&:hover': {
      background: theme.colors['fill-two-selected'],
      cursor: 'pointer',
    },
  },
}))

export function AITableEntry({
  item,
  onClickPin,
  pinLoading,
  modal,
  hidePins,
  ...props
}: {
  item: ChatThreadTinyFragment | AiPinFragment
  onClickPin?: () => void
  pinLoading?: boolean
  modal?: boolean | null
  hidePins?: boolean | null
} & ComponentPropsWithRef<typeof AIThreadsTableEntrySC>) {
  const theme = useTheme()
  const { pathname } = useLocation()
  const { goToThread, goToInsight } = useChatbot()

  const isPin = item.__typename === 'AiPin'
  const isInsight = isPin && !item.thread

  const thread = isPin ? item.thread : (item as ChatThreadTinyFragment)
  const insight = item.insight
  const insightPathUrl = getInsightPathInfo(insight)?.url

  const timestamp = getThreadOrPinTimestamp(item)

  const isStale = isAfter(dayjs(), dayjs(timestamp).add(24, 'hours'))

  const onClick = useCallback(() => {
    if (isInsight && insight) goToInsight(insight)
    if (!isInsight && thread) goToThread(thread)
  }, [isInsight, insight, goToInsight, thread, goToThread])

  if ((isInsight && !insight) || (!isInsight && !thread)) return null

  return (
    <AIThreadsTableEntrySC
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      {...props}
    >
      <AIEntryLabel
        insight={insight}
        isInsight={isInsight}
        isStale={isStale}
        thread={thread}
        opacity={isStale ? 0.6 : 1}
      />
      {insightPathUrl && pathname?.includes(insightPathUrl) && (
        <Chip
          css={{ minWidth: 'fit-content' }}
          severity="info"
        >
          Current page
        </Chip>
      )}
      <CaptionP css={{ opacity: isStale ? 0.6 : 1, flexShrink: 0 }}>
        {fromNow(timestamp)}
      </CaptionP>
      {!modal && (
        <>
          <Chip severity={isStale ? 'neutral' : 'success'}>
            {isStale ? 'Stale' : 'Active'}
          </Chip>
          {!hidePins && (
            <IconFrame
              clickable
              onClick={(e) => {
                e.stopPropagation()
                if (pinLoading) return
                onClickPin?.()
              }}
              icon={
                pinLoading ? (
                  <Spinner />
                ) : isPin ? (
                  <PushPinFilledIcon color={theme.colors['icon-info']} />
                ) : (
                  <PushPinOutlineIcon />
                )
              }
            />
          )}
        </>
      )}
      {isInsight ? (
        <MoreMenuTrigger
          disabled
          css={{ cursor: 'default' }}
        />
      ) : (
        <AITableActions thread={thread} />
      )}
    </AIThreadsTableEntrySC>
  )
}

export function AIEntryLabel({
  thread,
  insight,
  isInsight,
  isStale,
  ...props
}: {
  thread?: Nullable<ChatThreadTinyFragment>
  insight?: Nullable<AiInsightSummaryFragment>
  isInsight: boolean
  isStale: boolean
} & ComponentProps<typeof Flex>) {
  const insightPathInfo = getInsightPathInfo(insight)
  const flowPath = thread?.flow && {
    path: [thread.flow.name],
    url: getFlowDetailsPath({ flowId: thread.flow.id }),
  }

  return (
    <Flex
      alignItems="center"
      gap="small"
      flex={1}
      {...props}
    >
      <IconFrame
        size="medium"
        type="floating"
        css={{ flexShrink: 0 }}
        icon={
          <TableEntryIcon
            isInsight={isInsight}
            isStale={isStale}
            thread={thread}
            insight={insight}
          />
        }
      />
      <StackedText
        first={
          isInsight ? truncate(insight?.summary) : truncate(thread?.summary)
        }
        second={<TableEntryResourceLink {...(insightPathInfo || flowPath)} />}
        firstPartialType="body2"
        firstColor="text"
        secondPartialType="caption"
      />
    </Flex>
  )
}

function TableEntryIcon({
  isInsight,
  isStale,
  insight,
  thread,
}: {
  isInsight: boolean
  isStale: boolean
  insight: Nullable<AiInsightSummaryFragment>
  thread?: Nullable<ChatThreadTinyFragment>
}) {
  const theme = useTheme()
  const ICON_SIZE = 16
  if (!!insight?.cluster)
    return (
      <ClusterProviderIcon
        cluster={insight.cluster}
        size={ICON_SIZE}
      />
    )

  if (!!insight?.service)
    return (
      <ClusterProviderIcon
        cluster={insight.service.cluster}
        size={ICON_SIZE}
      />
    )

  if (!!insight?.serviceComponent)
    return (
      <ClusterProviderIcon
        cluster={insight.serviceComponent.service?.cluster}
        size={ICON_SIZE}
      />
    )

  if (!!insight?.stack)
    return (
      <StackTypeIcon
        size={ICON_SIZE}
        fullColor
        stackType={insight.stack.type}
      />
    )

  if (!!insight?.stackRun)
    return (
      <StackTypeIcon
        size={ICON_SIZE}
        fullColor
        stackType={insight.stackRun.type}
      />
    )

  // TODO: Add handler for insight?.clusterInsightComponent once we have a page for it

  if (isInsight)
    return isStale ? (
      <AiSparkleOutlineIcon
        size={ICON_SIZE}
        color={theme.colors['icon-light']}
      />
    ) : (
      <AiSparkleFilledIcon
        size={ICON_SIZE}
        color={theme.colors['icon-info']}
      />
    )

  if (thread?.flow)
    return (
      <AppIcon
        size="xxsmall"
        url={thread.flow.icon ?? ''}
        icon={
          <FlowIcon
            size={ICON_SIZE}
            color={theme.colors[isStale ? 'icon-light' : 'icon-info']}
          />
        }
      />
    )

  // fallback to chat icon
  return isStale ? (
    <ChatOutlineIcon
      size={ICON_SIZE}
      color={theme.colors['icon-light']}
    />
  ) : (
    <ChatFilledIcon
      size={ICON_SIZE}
      color={theme.colors['icon-info']}
    />
  )
}
export function getInsightPathInfo(
  insight: Nullable<AiInsightSummaryFragment>
): { path?: string[]; url?: string } | null {
  if (!!insight?.cluster) {
    return {
      path: [insight.cluster.name],
      url: getClusterDetailsPath({ clusterId: insight.cluster.id }),
    }
  }

  if (!!insight?.clusterInsightComponent) {
    return {
      path: [insight.clusterInsightComponent.name],
    }
  }

  if (!!insight?.service?.cluster) {
    return {
      path: [insight.service.cluster?.name, insight.service.name],
      url: getServiceDetailsPath({
        clusterId: insight.service.cluster?.id,
        serviceId: insight.service.id,
      }),
    }
  }

  if (!!insight?.serviceComponent?.service?.cluster) {
    return {
      path: [
        insight.serviceComponent.service?.cluster?.name,
        insight.serviceComponent.service?.name,
        insight.serviceComponent.name,
      ],
      url: getServiceComponentPath({
        clusterId: insight.serviceComponent.service?.cluster?.id,
        serviceId: insight.serviceComponent.service?.id,
        componentId: insight.serviceComponent.id,
      }),
    }
  }

  if (!!insight?.stack) {
    return {
      path: [insight.stack.name],
      url: getStacksAbsPath(insight.stack.id),
    }
  }

  if (!!insight?.stackRun?.stack) {
    return {
      path: [insight.stackRun.stack.name, insight.stackRun.message ?? ''],
      url: getStackRunsAbsPath(insight.stackRun.stack?.id, insight.stackRun.id),
    }
  }

  return null
}

function TableEntryResourceLink({
  path,
  url,
}: {
  path?: Nullable<string>[]
  url?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { closeChatbot } = useChatbot()

  if (!path) return null

  return (
    <a
      onClick={(e) => {
        e.stopPropagation()
        if (url) {
          navigate(url)
          closeChatbot()
        }
      }}
      css={{
        display: 'flex',
        gap: theme.spacing.xsmall,
        cursor: 'pointer',
        width: 'fit-content',
        '&:hover': {
          color: theme.colors.text,
          textDecoration: 'underline',
        },
      }}
    >
      {path.join('  •  ')}
      <ArrowTopRightIcon
        color="icon-default"
        size={12}
      />
    </a>
  )
}

export const getThreadOrPinTimestamp = (
  item: Nullable<ChatThreadTinyFragment | AiPinFragment>
) => {
  if (!item) return new Date()

  const isPin = item.__typename === 'AiPin'
  const isInsight = isPin && !item.thread

  const thread = isPin ? item.thread : (item as ChatThreadTinyFragment)
  const insight = item.insight

  return isInsight
    ? (insight?.updatedAt ?? insight?.insertedAt ?? new Date())
    : (thread?.lastMessageAt ?? thread?.insertedAt ?? new Date())
}

export const sortThreadsOrPins = (
  a: Nullable<ChatThreadTinyFragment | AiPinFragment>,
  b: Nullable<ChatThreadTinyFragment | AiPinFragment>
) => dayjs(getThreadOrPinTimestamp(b)).diff(dayjs(getThreadOrPinTimestamp(a)))

export const truncate = (text?: Nullable<string>, maxLength: number = 50) => {
  if (!text) return ''
  return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '')
}
