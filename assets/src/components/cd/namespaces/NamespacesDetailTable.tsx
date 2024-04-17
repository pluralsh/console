import { useRef } from 'react'
import { Card, TabPanel, Table } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useGetManagedNamespaceQuery } from 'generated/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { Body2BoldP, Body2P } from 'components/utils/typography/Text'

import {
  ColName,
  ColRef,
  ColRepo,
  ColTemplated,
} from './NamespaceDetailColumns'

export function NamespacesDetailTable({
  namespaceId,
}: {
  namespaceId?: string
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)

  const queryResult = useGetManagedNamespaceQuery({
    variables: {
      namespaceId: namespaceId || '',
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const { error, loading, data: currentData, previousData } = queryResult
  const data = currentData || previousData

  const managedNamespace = data?.managedNamespace
  const service = managedNamespace?.service

  const columns = [ColName, ColRef, ColRepo, ColTemplated]

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <Card
        padding="large"
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <div css={{ flexGrow: 1 }}>
          <Body2BoldP>Description</Body2BoldP>
          <Body2P
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            {managedNamespace?.description || '--'}
          </Body2P>
        </div>
        <div css={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Body2BoldP>Labels</Body2BoldP>
          <Body2P>
            {Object.keys(managedNamespace?.labels || {})
              ?.map((label) => `${label}: ${managedNamespace?.labels?.[label]}`)
              .join(', ')}
          </Body2P>
        </div>
      </Card>
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={[service] || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            isFetchingNextPage={loading}
            reactTableOptions={{ meta: { refetch: () => null } }}
          />
        </FullHeightTableWrap>
      </TabPanel>
    </div>
  )
}
