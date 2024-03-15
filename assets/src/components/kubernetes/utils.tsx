import uniqWith from 'lodash/uniqWith'
import { useMemo, useState } from 'react'
import { ColumnHelper, SortingState, TableOptions } from '@tanstack/react-table'

import { ChipList } from '@pluralsh/design-system'

import {
  Types_ListMeta as ListMetaT,
  Types_ObjectMeta as ObjectMetaT,
} from '../../generated/graphql-kubernetes'
import { DateTimeCol } from '../utils/table/DateTimeCol'

export const ITEMS_PER_PAGE = 25

export const DEFAULT_DATA_SELECT = {
  itemsPerPage: `${ITEMS_PER_PAGE}`,
  page: '1',
}

export function useDefaultColumns<
  T extends { objectMeta: ObjectMetaT } = { objectMeta: ObjectMetaT },
>(columnHelper: ColumnHelper<T>) {
  return useMemo(
    () => ({
      colName: columnHelper.accessor((r) => r?.objectMeta.name, {
        id: 'name',
        header: 'Name',
        enableSorting: true,
        meta: { truncate: true },
        cell: ({ getValue }) => getValue(),
      }),
      colNamespace: columnHelper.accessor((r) => r?.objectMeta.namespace, {
        id: 'namespace',
        header: 'Namespace',
        enableSorting: true,
        cell: ({ getValue }) => getValue(),
      }),
      colLabels: columnHelper.accessor((r) => r?.objectMeta.labels, {
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
              emptyState={null}
            />
          )
        },
      }),
      colCreationTimestamp: columnHelper.accessor(
        (r) => r?.objectMeta.creationTimestamp,
        {
          id: 'creationTimestamp',
          header: 'Creation',
          enableSorting: true,
          cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
        }
      ),
    }),
    [columnHelper]
  )
}

export function usePageInfo(items: any[], listMeta: ListMetaT | undefined) {
  const totalItems = listMeta?.totalItems ?? 0
  const pages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const page = Math.ceil(items.length / ITEMS_PER_PAGE)
  const hasNextPage = page < pages

  return { page, hasNextPage }
}

export function useSortedTableOptions(options?: TableOptions<any>) {
  const [sorting, setSorting] = useState<SortingState>([])

  return useMemo(
    () => ({
      sortBy: sorting.map((s) => `${s.desc ? 'd' : 'a'},${s.id}`).join(','),
      reactTableOptions: {
        onSortingChange: setSorting,
        manualSorting: true,
        state: { sorting },
        ...options,
      },
    }),
    [options, sorting, setSorting]
  )
}

export function extendConnection(
  prev: any,
  next: any,
  query: string,
  key: string
) {
  if (!next) {
    return prev
  }

  const uniq = uniqWith(
    [...(prev[query]?.[key] ?? []), ...(next[query]?.[key] ?? [])],
    (a, b) =>
      a?.objectMeta.uid ? a?.objectMeta.uid === b?.objectMeta.uid : false
  )

  return {
    [query]: {
      ...prev[query],
      [key]: uniq,
    },
  }
}
