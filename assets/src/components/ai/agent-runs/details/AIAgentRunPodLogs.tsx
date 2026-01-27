import { useAgentRunPodLogsQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'
import { AI_AGENT_RUNS_PARAM_RUN_ID } from 'routes/aiRoutesConsts.tsx'
import { isNonNullable } from 'utils/isNonNullable'
import { ContainerLogsTable } from '../../../cd/cluster/pod/logs/ContainerLogs.tsx'
import { SinceSecondsOptions } from '../../../cd/cluster/pod/logs/Logs.tsx'
import { useMemo } from 'react'
import { GqlError } from 'components/utils/Alert.tsx'
import { Flex } from '@pluralsh/design-system'

export function AIAgentRunPodLogs() {
  const runId = useParams()[AI_AGENT_RUNS_PARAM_RUN_ID] ?? ''
  const defaultContainer = 'default'
  const sinceSeconds = SinceSecondsOptions.Week
  const { data, loading, error, refetch } = useAgentRunPodLogsQuery({
    skip: !runId,
    variables: { runId, container: defaultContainer, sinceSeconds },
    notifyOnNetworkStatusChange: true,
  })
  const logs = useMemo(
    () => data?.agentRun?.pod?.logs?.filter(isNonNullable) ?? [],
    [data]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      height="100%"
    >
      <ContainerLogsTable
        logs={logs}
        loading={loading}
        refetch={() => {
          console.log('refetching')
          refetch()
        }}
        container={defaultContainer}
      />
    </Flex>
  )
}
