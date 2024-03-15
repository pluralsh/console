import { Row, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { LoopingLogo, Table } from '@pluralsh/design-system'

import {
  Service_Service as ServiceT,
  useServicesQuery,
} from '../../../generated/graphql-kubernetes'
import { useKubernetesContext } from '../Kubernetes'
import {
  DEFAULT_DATA_SELECT,
  extendConnection,
  useDefaultColumns,
  usePageInfo,
  useSortedTableOptions,
} from '../utils'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

const columnHelper = createColumnHelper<ServiceT>()

export default function Services() {
  const { cluster, namespace, filter } = useKubernetesContext()
  const { sortBy, reactTableOptions } = useSortedTableOptions()

  const { data, loading, fetchMore } = useServicesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy,
    },
  })

  const services = data?.handleGetServiceList?.services || []
  const { page, hasNextPage } = usePageInfo(
    services,
    data?.handleGetServiceList?.listMeta
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult,
          'handleGetServiceList',
          'services'
        ),
    })
  }, [fetchMore, hasNextPage, page])

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns<ServiceT>(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={services}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        onRowClick={(_e, { original }: Row<ServiceT>) => console.log(original)}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
