import {
  ArrowTopRightIcon,
  Chip,
  Flex,
  GitPullIcon,
  IconFrame,
  PrOpenIcon,
  RobotIcon,
  Spinner,
  StackIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useNativeDomEvent } from 'components/hooks/useNativeDomEvent.tsx'
import { isEmpty } from 'lodash'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts.tsx'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts.tsx'
import { useTheme } from 'styled-components'
import {
  AgentSessionFragment,
  useAgentSessionsQuery,
} from '../../generated/graphql.ts'
import {
  dayjsExtended as dayjs,
  fromNow,
  isAfter,
} from '../../utils/datetime.ts'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import { TableSkeleton } from '../utils/SkeletonLoaders.tsx'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { Body2P, CaptionP } from '../utils/typography/Text.tsx'
import { useChatbot } from './AIContext.tsx'
import { EmptyStateCompact } from './AIThreads.tsx'
import { AgentIcon } from './chatbot/AgentSelect.tsx'

export const CLOSE_CHAT_ACTION_PANEL_EVENT = 'pointerdown'

export function AIAgent() {
  const theme = useTheme()
  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useAgentSessionsQuery,
      keyPath: ['agentSessions'],
    })

  const agentSessions = useMemo(
    () => mapExistingNodes(data?.agentSessions),
    [data]
  )

  if (error) return <GqlError error={error} />

  if (!data)
    return (
      <TableSkeleton
        numColumns={1}
        height={70}
        centered={true}
        styles={{
          height: '100%',
          padding: theme.spacing.xlarge,
          '> svg': {
            width: '100%',
          },
        }}
      />
    )

  if (data && isEmpty(agentSessions)) {
    return (
      <EmptyStateCompact
        icon={
          <RobotIcon
            color="icon-primary"
            size={24}
          />
        }
        message="No agent sessions"
        description="You can create a new agent session from the Plural AI side panel."
        cssProps={{ overflow: 'auto' }}
      />
    )
  }

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      overflow="hidden"
    >
      <Flex
        direction="column"
        gap="large"
        height="100%"
      >
        <Table
          rowBg="raised"
          fullHeightWrap
          virtualizeRows
          padCells={false}
          data={agentSessions}
          columns={columns}
          hideHeader
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No entries found.' }}
        />
      </Flex>
    </Flex>
  )
}

const columnHelper = createColumnHelper<AgentSessionFragment>()

const columns = [
  columnHelper.accessor((item) => item, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const rowChipsWrapperRef = useRef<HTMLDivElement>(null)
      const { goToThread } = useChatbot()

      // need to do this natively so it stops propagation correctly, see Console.tsx
      const wrapperRef = useRef<HTMLDivElement>(null)
      useNativeDomEvent(wrapperRef, CLOSE_CHAT_ACTION_PANEL_EVENT, (e) => {
        // a little hacky but allows us to still hit the links in the chips
        if (rowChipsWrapperRef.current?.contains(e.target as Node)) return
        if (agentSession?.thread) {
          e.stopPropagation()
          goToThread(agentSession.thread.id)
        }
      })

      const agentSession = getValue()
      const { pullRequest, stack, service } = agentSession

      const timestamp =
        agentSession?.thread?.lastMessageAt ??
        agentSession?.thread?.insertedAt ??
        new Date()

      const isStale = isAfter(dayjs(), dayjs(timestamp).add(24, 'hours'))

      return (
        <div
          ref={wrapperRef}
          css={{
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
          }}
        >
          <Flex
            alignItems="center"
            gap="small"
            flex={1}
          >
            <Flex
              gap="small"
              alignItems="center"
              flex={1}
            >
              <IconFrame
                size="medium"
                type="floating"
                css={{ flexShrink: 0 }}
                icon={<AgentIcon type={agentSession.type} />}
              />
              <Body2P css={{ opacity: isStale ? 0.6 : 1 }}>
                {agentSession.thread?.summary}
              </Body2P>
              <Flex
                gap="xsmall"
                ref={rowChipsWrapperRef}
              >
                {stack?.name && (
                  <IconFrame
                    as={Link}
                    type="floating"
                    to={getStacksAbsPath(stack.id)}
                    icon={<StackIcon />}
                    tooltip={`View '${stack.name}' stack`}
                    style={{ flexShrink: 0 }}
                  >
                    {stack.name}
                  </IconFrame>
                )}
                {pullRequest?.url && (
                  <IconFrame
                    as={Link}
                    to={pullRequest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    type="floating"
                    icon={<PrOpenIcon />}
                    tooltip={
                      <Flex
                        alignItems="center"
                        gap="xsmall"
                      >
                        {`View pull request `} <ArrowTopRightIcon />
                      </Flex>
                    }
                    style={{ flexShrink: 0 }}
                  />
                )}
                {service?.name && (
                  <IconFrame
                    as={Link}
                    type="floating"
                    to={getServiceDetailsPath({
                      serviceId: service?.id,
                      clusterId: service?.cluster?.id,
                    })}
                    icon={<GitPullIcon />}
                    tooltip={`View ${service.name}`}
                    style={{ flexShrink: 0 }}
                  />
                )}
              </Flex>
            </Flex>
            <CaptionP css={{ opacity: isStale ? 0.6 : 1, flexShrink: 0 }}>
              Last updated {fromNow(timestamp)}
            </CaptionP>
            {agentSession?.done ? (
              <Chip size="small">Complete</Chip>
            ) : (
              <Chip
                size="small"
                severity="info"
              >
                <Flex
                  alignItems="center"
                  gap="xsmall"
                >
                  <Spinner
                    size={8}
                    color={theme.colors['icon-info']}
                  />
                  Running
                </Flex>
              </Chip>
            )}
          </Flex>
        </div>
      )
    },
  }),
]
