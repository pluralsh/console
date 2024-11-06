import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  ArrowTopRightIcon,
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

import {
  AiInsightSummaryFragment,
  AiPinFragment,
  ChatThreadTinyFragment,
} from 'generated/graphql'
import { ReactNode, useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime.ts'
import { useChatbot } from './AIContext.tsx'
import { ClusterProviderIcon } from '../utils/Provider.tsx'
import { StackTypeIcon } from '../stacks/common/StackTypeIcon.tsx'
import { MoreMenuTrigger } from '../utils/MoreMenu.tsx'
import { AiThreadsTableActions } from './AiThreadsTableActions.tsx'
import { useNavigate } from 'react-router-dom'
import {
  getClusterDetailsPath,
  getServiceComponentPath,
  getServiceDetailsPath,
} from '../../routes/cdRoutesConsts.tsx'
import {
  getStackRunsAbsPath,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts.tsx'

const AIThreadsTableEntrySC = styled.div(({ theme }) => ({
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
  const theme = useTheme()
  const { goToThread, goToInsight } = useChatbot()

  const isPin = item.__typename === 'AiPin'
  const isInsight = isPin && !item.thread

  const thread = isPin ? item.thread : (item as ChatThreadTinyFragment)
  const insight = item.insight

  const timestamp = isInsight
    ? insight?.updatedAt || insight?.insertedAt || dayjs().toNow()
    : thread?.lastMessageAt ||
      thread?.updatedAt ||
      thread?.insertedAt ||
      dayjs().toNow()

  const isStale = dayjs().isAfter(dayjs(timestamp).add(24, 'hours'))

  // TODO: Memoization.

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
    >
      <Flex
        gap="small"
        flex={1}
      >
        <IconFrame
          type="floating"
          icon={
            <TableEntryIcon
              isInsight={isInsight}
              isStale={isStale}
              insight={insight}
            />
          }
        />
        <StackedText
          css={{ maxWidth: '450px', color: theme.colors['text'] }}
          truncate
          first={
            isInsight
              ? (insight?.summary?.substring(0, 250) ?? '')
              : thread!.summary
          }
          second={<TableEntrySubheader insight={insight} />}
          firstPartialType="body1Bold"
        />
      </Flex>
      <CaptionP css={{ opacity: isStale ? 0.6 : 1 }}>
        {dayjs(timestamp).fromNow()}
      </CaptionP>
      {!modal && (
        <>
          <Chip severity={isStale ? 'neutral' : 'success'}>
            {isStale ? 'Stale' : 'Active'}
          </Chip>
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
        </>
      )}
      {isInsight ? (
        <MoreMenuTrigger
          disabled
          css={{ cursor: 'default' }}
        />
      ) : (
        <AiThreadsTableActions thread={thread} />
      )}
    </AIThreadsTableEntrySC>
  )
}

function TableEntryIcon({
  isInsight,
  isStale,
  insight,
}: {
  isInsight: boolean
  isStale: boolean
  insight: Nullable<AiInsightSummaryFragment>
}): ReactNode {
  const theme = useTheme()

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

  // TODO: Add handler for insight?.clusterInsightComponent.

  return isInsight ? (
    isStale ? (
      <ChatOutlineIcon color={theme.colors['icon-light']} />
    ) : (
      <ChatFilledIcon color={theme.colors['icon-info']} />
    )
  ) : isStale ? (
    <AiSparkleOutlineIcon color={theme.colors['icon-light']} />
  ) : (
    <AiSparkleFilledIcon color={theme.colors['icon-info']} />
  )
}

export function TableEntrySubheader({
  insight,
}: {
  insight: Nullable<AiInsightSummaryFragment>
}): ReactNode {
  if (!!insight?.cluster)
    return (
      <TableEntryResourceLink
        path={[insight.cluster.name]}
        url={getClusterDetailsPath({ clusterId: insight.cluster.id })}
      />
    )

  if (!!insight?.clusterInsightComponent)
    return (
      <TableEntryResourceLink path={[insight.clusterInsightComponent.name]} />
    )

  if (!!insight?.service)
    return (
      <TableEntryResourceLink
        path={[insight.service.cluster?.name, insight.service.name]}
        url={getServiceDetailsPath({
          clusterId: insight.service.cluster?.id,
          serviceId: insight.service.id,
        })}
      />
    )

  if (!!insight?.serviceComponent)
    return (
      <TableEntryResourceLink
        path={[
          insight.serviceComponent.service?.cluster?.name,
          insight.serviceComponent.service?.name,
          insight.serviceComponent.name,
        ]}
        url={getServiceComponentPath({
          clusterId: insight.serviceComponent.service?.cluster?.id,
          serviceId: insight.serviceComponent.service?.id,
          componentId: insight.serviceComponent.id,
        })}
      />
    )

  if (!!insight?.stack)
    return (
      <TableEntryResourceLink
        path={[insight.stack.name]}
        url={getStacksAbsPath(insight.stack.id)}
      />
    )

  if (!!insight?.stackRun)
    return (
      <TableEntryResourceLink
        path={[insight.stackRun.stack?.name, insight.stackRun.id]}
        url={getStackRunsAbsPath(
          insight.stackRun.stack?.id,
          insight.stackRun.id
        )}
      />
    )

  return null
}

function TableEntryResourceLink({
  path,
  url,
}: {
  path: Nullable<string>[]
  url?: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  return (
    <div
      onClick={(e) => {
        e.preventDefault() // FIXME
        if (url) navigate(url)
      }}
      css={{
        display: 'flex',
        gap: theme.spacing.xsmall,

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
    </div>
  )
}
