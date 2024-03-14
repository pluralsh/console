import { useCallback } from 'react'

import { ChipList, LoopingLogo, Table } from '@pluralsh/design-system'

import { Row, createColumnHelper } from '@tanstack/react-table'

import { useKubernetesContext } from '../Kubernetes'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'
import {
  Deployment_Deployment as DeploymentT,
  useDeploymentsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'

import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

import { DateTimeCol } from '../../utils/table/DateTimeCol'

const columnHelper = createColumnHelper<DeploymentT>()

const columns = [
  columnHelper.accessor((deployment) => deployment?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((deployment) => deployment?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((deployment) => deployment?.objectMeta.labels, {
    id: 'labels',
    header: 'Labels',
    cell: ({ getValue }) => {
      const labels = getValue()

      return (
        <ChipList
          size="small"
          limit={1}
          values={Object.entries(labels || {})}
          transformValue={(label) => label.join(': ')}
        />
      )
    },
  }),
  columnHelper.accessor(
    (deployment) => deployment?.objectMeta.creationTimestamp,
    {
      id: 'creationTimestamp',
      header: 'Created',
      enableSorting: true,
      cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
    }
  ),
]

export default function Deployments() {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sorting, reactTableOptions } = useSortedTableOptions<DeploymentT>()

  const { data, loading, fetchMore } = useDeploymentsQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy: sorting.map((s) => `${s.desc ? 'd' : 'a'},${s.id}`).join(','),
    },
  })

  const pods = data?.handleGetDeployments?.deployments || []
  const { page, hasNextPage } = usePageInfo(
    pods,
    data?.handleGetDeployments?.listMeta
  )

  console.log(pods)

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult,
          'handleGetDeployments',
          'deployments'
        ),
    })
  }, [fetchMore, hasNextPage, page])

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={pods}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        virtualizeRows
        onRowClick={(_e, { original }: Row<DeploymentT>) =>
          console.log(original)
        } // TODO: Redirect.
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
