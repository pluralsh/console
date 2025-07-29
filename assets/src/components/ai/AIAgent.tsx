import { Flex, RobotIcon, Table } from '@pluralsh/design-system'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../utils/table/useFetchPaginatedData.tsx'
import {
  ChatThreadTinyFragment,
  useAgentSessionsQuery,
} from '../../generated/graphql.ts'
import { isEmpty } from 'lodash'
import { EmptyStateCompact } from './AIThreads.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import { TableSkeleton } from '../utils/SkeletonLoaders.tsx'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

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
        description="You can create a new agent session from the AI Copilot panel."
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
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          emptyStateProps={{ message: 'No entries found.' }}
        />
      </Flex>
    </Flex>
  )
}

const columnHelper = createColumnHelper<ChatThreadTinyFragment>()

const columns = [
  columnHelper.accessor((item) => item, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const item = getValue()

      return (
        <div
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
          {JSON.stringify(item)}
        </div>
      )
    },
  }),
]
