import { Flex, RobotIcon } from '@pluralsh/design-system'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { useAgentSessionsQuery } from '../../generated/graphql.ts'
import { isEmpty } from 'lodash'
import { EmptyStateCompact } from './AIThreads.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import { TableSkeleton } from '../utils/SkeletonLoaders.tsx'
import { useTheme } from 'styled-components'

export function AIAgent() {
  const theme = useTheme()
  const { data, error } = useFetchPaginatedData({
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
        {JSON.stringify(data, null, 2)}
      </Flex>
    </Flex>
  )
}
