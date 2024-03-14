import { Row, createColumnHelper } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import { LoopingLogo, Table } from '@pluralsh/design-system'

import {
  Ingressclass_IngressClass as IngressClassT,
  Pod_Pod as PodT,
  useIngressClassesQuery,
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

const columnHelper = createColumnHelper<IngressClassT>()

export default function IngressClasses() {
  const { cluster, filter } = useKubernetesContext()
  const { sortBy, reactTableOptions } = useSortedTableOptions<IngressClassT>()

  const { data, loading, fetchMore } = useIngressClassesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      ...DEFAULT_DATA_SELECT,
      filterBy: `name,${filter}`,
      sortBy,
    },
  })

  const ingresses = data?.handleGetIngressClassList?.items || []
  const { page, hasNextPage } = usePageInfo(
    ingresses,
    data?.handleGetIngressClassList?.listMeta
  )

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) return
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult,
          'handleGetIngressClassList',
          'items'
        ),
    })
  }, [fetchMore, hasNextPage, page])

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns<IngressClassT>(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={ingresses}
        columns={columns}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        onRowClick={(_e, { original }: Row<PodT>) => console.log(original)}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
