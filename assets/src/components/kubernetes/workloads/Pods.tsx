import { Button, ChipList, LoopingLogo, Table } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'

import { useCallback, useState } from 'react'

import { useKubernetesContext } from '../Kubernetes'
import {
  Pod_Pod as PodT,
  usePodsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import uniqWith from 'lodash/uniqWith'

const itemsPerPage = 10

const columnHelper = createColumnHelper<PodT>()

const columns = [
  columnHelper.accessor((pod) => pod?.objectMeta.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.namespace, {
    id: 'namespace',
    header: 'Namespace',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((pod) => pod?.objectMeta.labels, {
    id: 'labels',
    header: 'Labels',
    enableSorting: true,
    enableGlobalFilter: true,
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
  columnHelper.accessor((pod) => pod?.objectMeta.creationTimestamp, {
    id: 'created',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Pods() {
  const { cluster, namespace, filter } = useKubernetesContext()

  const { data, loading, fetchMore } = usePodsQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: {
      namespace,
      filterBy: `name,${filter}`,
      itemsPerPage: `${itemsPerPage}`,
      page: '1',
      sortBy: 'a,name', // TODO: Sorting.
    },
  })

  const pods = data?.handleGetPods?.pods || []
  const totalItems = data?.handleGetPods?.listMeta.totalItems ?? 0
  const pages = Math.ceil(totalItems / itemsPerPage)
  const page = Math.ceil(pods.length / itemsPerPage)
  const hasNextPage = page < pages

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage) {
      return
    }
    fetchMore({
      variables: { page: page + 1 },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev
        }

        const uniq = uniqWith(
          [
            ...(prev.handleGetPods?.pods ?? []),
            ...(fetchMoreResult.handleGetPods?.pods ?? []),
          ],
          (a, b) =>
            a?.objectMeta.uid ? a?.objectMeta.uid === b?.objectMeta.uid : false
        )

        return {
          handleGetPods: {
            ...prev.handleGetPods,
            pods: uniq,
          },
        }
      },
    })
  }, [fetchMore, hasNextPage, page])

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        data={pods}
        columns={columns}
        // virtualizeRows
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        // reactTableOptions={reactTableOptions}
        // reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
        // onVirtualSliceChange={setVirtualSlice}
        onRowClick={(_e, { original }: Row<PodT>) => console.log(original)} // TODO: Redirect.
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
