import {
  AppIcon,
  ArrowTopRightIcon,
  ChatFilledIcon,
  ChatOutlineIcon,
  Chip,
  Flex,
  FlowIcon,
  IconFrame,
} from '@pluralsh/design-system'

import { StackedText } from 'components/utils/table/StackedText'

import { CaptionP } from 'components/utils/typography/Text'

import {
  AiInsightSummaryFragment,
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
import { ClusterProviderIcon } from '../utils/Provider.tsx'
import { useChatbot } from './AIContext.tsx'
import { AITableActions } from './AITableActions.tsx'

const AIThreadsTableEntrySC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xlarge,
  height: '100%',
  width: '100%',
  padding: theme.spacing.medium,
  '&:not(:has(button:hover)):not(:has(a:hover))': {
    '&:hover': {
      background: theme.colors['fill-zero-hover'],
      cursor: 'pointer',
    },
  },
}))

export function AITableEntry({
  thread,
  ...props
}: {
  thread: ChatThreadTinyFragment
} & ComponentPropsWithRef<typeof AIThreadsTableEntrySC>) {
  const { goToThread } = useChatbot()

  const timestamp = getThreadTimestamp(thread)

  const isStale = isAfter(dayjs(), dayjs(timestamp).add(24, 'hours'))

  const onClick = useCallback(() => {
    if (thread) goToThread(thread.id)
  }, [thread, goToThread])

  if (!thread) return null

  return (
    <AIThreadsTableEntrySC
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
      {...props}
    >
      <AIEntryLabel
        isStale={isStale}
        thread={thread}
        opacity={isStale ? 0.6 : 1}
      />
      <CaptionP css={{ opacity: isStale ? 0.6 : 1, flexShrink: 0 }}>
        {fromNow(timestamp)}
      </CaptionP>
      <Chip
        size="small"
        severity={isStale ? 'neutral' : 'success'}
      >
        {isStale ? 'Stale' : 'Active'}
      </Chip>
      <AITableActions thread={thread} />
    </AIThreadsTableEntrySC>
  )
}

export function AIEntryLabel({
  thread,
  isStale,
  ...props
}: {
  thread?: Nullable<ChatThreadTinyFragment>
  isStale: boolean
} & ComponentProps<typeof Flex>) {
  const { pathname } = useLocation()
  const insightPathInfo = getInsightPathInfo(thread?.insight)
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
            isStale={isStale}
            thread={thread}
          />
        }
      />
      <StackedText
        first={truncate(thread?.summary)}
        second={
          <Flex
            gap="small"
            align="center"
          >
            <TableEntryResourceLink {...(insightPathInfo || flowPath)} />{' '}
            {insightPathInfo?.url &&
              pathname?.includes(insightPathInfo.url) && (
                <CaptionP $color="icon-info">Current page</CaptionP>
              )}
          </Flex>
        }
        firstPartialType="body2"
        firstColor="text"
        secondPartialType="caption"
      />
    </Flex>
  )
}

function TableEntryIcon({
  isStale,
  thread,
}: {
  isStale: boolean
  thread?: Nullable<ChatThreadTinyFragment>
}) {
  const insight = thread?.insight
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

export function TableEntryResourceLink({
  path,
  url,
}: {
  path?: Nullable<string>[]
  url?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  if (!path) return null

  return (
    <a
      onClick={(e) => {
        e.stopPropagation()
        if (url) navigate(url)
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

export const getThreadTimestamp = (thread: Nullable<ChatThreadTinyFragment>) =>
  thread?.lastMessageAt ?? thread?.insertedAt ?? new Date()

export const sortThreadsOrPins = (
  a: Nullable<ChatThreadTinyFragment>,
  b: Nullable<ChatThreadTinyFragment>
) => dayjs(getThreadTimestamp(b)).diff(dayjs(getThreadTimestamp(a)))

export const truncate = (text?: Nullable<string>, maxLength: number = 50) => {
  if (!text) return ''
  return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '')
}
