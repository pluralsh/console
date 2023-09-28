import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useClustersQuery } from 'generated/graphql'
import { useEffect, useMemo } from 'react'
import { isEmpty } from 'lodash'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useCD } from '../ContinuousDeployment'

import { columns } from './columns'
import CreateCluster from './CreateCluster'

export default function Clusters() {
  const { data } = useClustersQuery()
  const cd = useCD()

  const headerActions = useMemo(() => <CreateCluster />, [])

  useEffect(() => cd.setActionsContent(headerActions), [cd, headerActions])

  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div>
      {!isEmpty(data?.clusters?.edges) ? (
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
      )}
    </div>
  )
}
