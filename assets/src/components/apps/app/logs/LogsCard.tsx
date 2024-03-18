import { Card } from '@pluralsh/design-system'
import { LOGS_Q } from 'components/graphql/dashboards'
import { Flex } from 'honorable'
import { useCallback, useState } from 'react'
import { useQuery } from '@apollo/client'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import LogContent from './LogContent'
import LogsScrollIndicator from './LogsScrollIndicator'

const POLL_INTERVAL = 10 * 1000
const LIMIT = 1000

export function LogsCard({
  namespace,
  query,
  addLabel,
  fullscreen = false,
  height = 800,
}: any) {
  const [listRef, setListRef] = useState<any>(null)
  const [live, setLive] = useState(true)
  const [loader, setLoader] = useState<any>(null)

  const { data, loading, fetchMore, refetch } = useQuery(LOGS_Q, {
    variables: { query, limit: LIMIT },
    pollInterval: live ? POLL_INTERVAL : 0,
  })

  const returnToTop = useCallback(() => {
    setLive(true)
    refetch().then(() => listRef?.scrollToItem(0))
    loader?.resetloadMoreItemsCache()
  }, [refetch, setLive, listRef, loader])

  return (
    <Card
      overflow="hidden"
      position="relative"
      height={height}
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
            namespace={namespace}
            logs={data.logs}
            setLoader={setLoader}
            search={query}
            loading={loading}
            fetchMore={fetchMore}
            updateFunc={null}
            onScroll={(arg) => setLive(!arg)}
            addLabel={addLabel}
            fullscreen={fullscreen}
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
