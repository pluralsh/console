import { Card, Flex, Table } from '@pluralsh/design-system'

import { useScmConnectionsQuery, useScmWebhooksQuery } from 'generated/graphql'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { CreateScmConnection } from './CreateScmConnection'
import { CreateScmWebhook } from './CreateScmWebhook'
import { columns as connectionsColumns } from './PrScmConnectionsColumns'
import { columns as webhooksColumns } from './ScmWebhooksColumns'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

export const PR_QUERY_PAGE_SIZE = 100

export function ScmManagement() {
  const connectionsQ = useFetchPaginatedData({
    queryHook: useScmConnectionsQuery,
    keyPath: ['scmConnections'],
  })

  const webhooksQ = useFetchPaginatedData({
    queryHook: useScmWebhooksQuery,
    keyPath: ['scmWebhooks'],
  })

  useSetPageHeaderContent(
    <SetupDependencyAutomation refetch={connectionsQ.refetch} />
  )

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <SectionCard
        title="connections"
        action={<CreateScmConnection refetch={connectionsQ.refetch} />}
      >
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
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            data={connectionsQ.data?.scmConnections?.edges || []}
            virtualizeRows
            hasNextPage={connectionsQ.pageInfo?.hasNextPage}
            fetchNextPage={connectionsQ.fetchNextPage}
            isFetchingNextPage={connectionsQ.loading}
            onVirtualSliceChange={connectionsQ.setVirtualSlice}
          />
        )}
      </SectionCard>
      <SectionCard
        title="webhooks"
        action={<CreateScmWebhook refetch={webhooksQ.refetch} />}
      >
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
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
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
  action,
  children,
}: {
  title: string
  action: ReactNode
  children: ReactNode
}) => {
  return (
    <SectionCardSC
      header={{
        size: 'large',
        outerProps: { style: { minHeight: 450 } },
        content: (
          <StretchedFlex>
            <span>{title}</span>
            {action}
          </StretchedFlex>
        ),
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
