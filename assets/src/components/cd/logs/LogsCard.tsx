import { Card } from '@pluralsh/design-system'
import LogContent from 'components/apps/app/logs/LogContent'
import LogsScrollIndicator from 'components/apps/app/logs/LogsScrollIndicator'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useClusterLogsQuery, useServiceLogsQuery } from 'generated/graphql'
import { Flex } from 'honorable'
import { useCallback, useMemo, useState } from 'react'

const LIMIT = 1000
const POLL_INTERVAL = 10 * 1000

function doUpdate(prev, result) {
  let key = 'cluster'

  if (prev.service) {
    key = 'service'
  }

  return {
    ...prev,
    [key]: {
      ...prev[key],
      logs: [...prev[key].logs, ...result[key].logs],
    },
  }
}

export function LogsCard({ serviceId, clusterId, query, addLabel }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const [live, setLive] = useState(true)
  const [loader, setLoader] = useState<any>(null)

  const clusterResp = useClusterLogsQuery({
    variables: { clusterId, query, limit: LIMIT },
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !clusterId,
  })

  const serviceResp = useServiceLogsQuery({
    variables: { serviceId, query, limit: LIMIT },
    pollInterval: live ? POLL_INTERVAL : 0,
    skip: !serviceId,
  })

  const { data, loading, fetchMore, refetch } = useMemo(
    () => (clusterId ? clusterResp : serviceResp),
    [clusterId, clusterResp, serviceResp]
  )

  const logs = useMemo(
    () =>
      clusterId
        ? clusterResp.data?.cluster?.logs
        : serviceResp.data?.serviceDeployment?.logs,
    [clusterId, clusterResp, serviceResp]
  )

  const returnToTop = useCallback(() => {
    setLive(true)
    refetch().then(() => listRef?.scrollToItem(0))
    loader?.resetloadMoreItemsCache()
  }, [refetch, setLive, listRef, loader])

  return (
    <Card
      overflow="hidden"
      position="relative"
      height="100%"
      borderLeft="none"
      borderTopLeftRadius={0}
      borderBottomLeftRadius={0}
    >
      <Flex
        direction="row"
        fill
        gap="small"
      >
        {data ? (
          <LogContent
            listRef={listRef}
            setListRef={setListRef}
            namespace={clusterId || serviceId}
            logs={logs}
            setLoader={setLoader}
            search={query}
            loading={loading}
            fetchMore={fetchMore}
            updateFunc={(prev, { fetchMoreResult }) =>
              doUpdate(prev, fetchMoreResult)
            }
            onScroll={(arg) => setLive(!arg)}
            addLabel={addLabel}
          />
        ) : (
          <LoadingIndicator />
        )}
      </Flex>
      {data && (
        <LogsScrollIndicator
          live={live}
          returnToTop={returnToTop}
        />
      )}
    </Card>
  )
}
