import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useClustersQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { isEmpty } from 'lodash'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useSetCDHeaderContent } from '../ContinuousDeployment'

import { columns } from './columns'
import CreateCluster from './create/CreateCluster'

export default function Clusters() {
  const { data } = useClustersQuery()
  const headerActions = useMemo(() => <CreateCluster />, [])

  useSetCDHeaderContent(headerActions)

  if (!data) {
    return <LoadingIndicator />
  }

  return !isEmpty(data?.clusters?.edges) ? (
    <FullHeightTableWrap>
      <Table
        data={data?.clusters?.edges || []}
        columns={columns}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  ) : (
    <EmptyState message="Looks like you don't have any CD clusters yet." />
  )
}
