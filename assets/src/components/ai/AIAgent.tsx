import { Flex } from '@pluralsh/design-system'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'
import { useAgentSessionsQuery } from '../../generated/graphql.ts'

export function AIAgent() {
  const { data } = useFetchPaginatedData({
    queryHook: useAgentSessionsQuery,
    keyPath: ['agentSessions'],
  })

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
