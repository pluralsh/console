import { Flex, RobotIcon } from '@pluralsh/design-system'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { useAgentSessionsQuery } from '../../generated/graphql.ts'
import { isEmpty } from 'lodash'
import { EmptyStateCompact } from './AIThreads.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'

export function AIAgent() {
  const { data } = useFetchPaginatedData({
    queryHook: useAgentSessionsQuery,
    keyPath: ['agentSessions'],
  })

  const agentSessions = useMemo(
    () => mapExistingNodes(data?.agentSessions),
    [data]
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
