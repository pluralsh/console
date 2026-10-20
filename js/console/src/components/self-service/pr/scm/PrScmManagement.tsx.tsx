import { Card, Flex, Table } from '@pluralsh/design-system'

import { useScmConnectionsQuery, useScmWebhooksQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { CreateScmConnection } from './CreateScmConnection'
import { CreateScmWebhook } from './CreateScmWebhook'
import { columns as connectionsColumns } from './PrScmConnectionsColumns'
import { columns as webhooksColumns } from './ScmWebhooksColumns'

export function ScmManagement() {
  const connectionsQ = useFetchPaginatedData({
    queryHook: useScmConnectionsQuery,
    keyPath: ['scmConnections'],
  })

  const webhooksQ = useFetchPaginatedData({
    queryHook: useScmWebhooksQuery,
    keyPath: ['scmWebhooks'],
  })

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <PageToolbarPortal>
        <CreateScmWebhook refetch={webhooksQ.refetch} />
        <CreateScmConnection refetch={connectionsQ.refetch} />
      </PageToolbarPortal>
      <SectionCard title="connections">
        {connectionsQ.error ? (
          <GqlError error={connectionsQ.error} />
        ) : (
          <Table
            flush
            fullHeightWrap
            fillLevel={1}
            columns={connectionsColumns}
            loading={!connectionsQ.data && connectionsQ.loading}
            reactTableOptions={{ meta: { refetch: connectionsQ.refetch } }}
            data={connectionsQ.data?.scmConnections?.edges || []}
            virtualizeRows
            hasNextPage={connectionsQ.pageInfo?.hasNextPage}
            fetchNextPage={connectionsQ.fetchNextPage}
            isFetchingNextPage={connectionsQ.loading}
            onVirtualSliceChange={connectionsQ.setVirtualSlice}
          />
        )}
      </SectionCard>
      <SectionCard title="webhooks">
        {webhooksQ.error ? (
          <GqlError error={webhooksQ.error} />
        ) : (
          <Table
            flush
            fullHeightWrap
            fillLevel={1}
            columns={webhooksColumns}
            loading={!webhooksQ.data && webhooksQ.loading}
            reactTableOptions={{ meta: { refetch: webhooksQ.refetch } }}
            data={webhooksQ.data?.scmWebhooks?.edges || []}
            virtualizeRows
            hasNextPage={webhooksQ.pageInfo?.hasNextPage}
            fetchNextPage={webhooksQ.fetchNextPage}
            isFetchingNextPage={webhooksQ.loading}
            onVirtualSliceChange={webhooksQ.setVirtualSlice}
          />
        )}
      </SectionCard>
      <div style={{ minHeight: 16 }} />
    </Flex>
  )
}

const SectionCard = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => {
  return (
    <SectionCardSC
      header={{
        size: 'large',
        outerProps: { style: { minHeight: 450 } },
        content: title,
      }}
    >
      {children}
    </SectionCardSC>
  )
}

const SectionCardSC = styled(Card)({
  flex: 1,
  overflow: 'hidden',
})
