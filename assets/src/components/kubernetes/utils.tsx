import uniqWith from 'lodash/uniqWith'
import { useMemo, useState } from 'react'
import { ColumnHelper, SortingState, TableOptions } from '@tanstack/react-table'
import { Card, ChipList, Prop } from '@pluralsh/design-system'
import { Link, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import moment from 'moment/moment'

import {
  Types_ListMeta as ListMetaT,
  Maybe,
  Types_ObjectMeta as ObjectMetaT,
  Types_TypeMeta as TypeMetaT,
} from '../../generated/graphql-kubernetes'
import { DateTimeCol } from '../utils/table/DateTimeCol'
import {
  ClusterTinyFragment,
  useClustersTinyQuery,
} from '../../generated/graphql'
import { InlineLink } from '../utils/typography/InlineLink'
import { getResourceDetailsAbsPath } from '../../routes/kubernetesRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'

export const ITEMS_PER_PAGE = 25

export const DEFAULT_DATA_SELECT = {
  itemsPerPage: `${ITEMS_PER_PAGE}`,
  page: '1',
}

export function useDefaultColumns<
  T extends { objectMeta: ObjectMetaT; typeMeta: TypeMetaT } = {
    objectMeta: ObjectMetaT
    typeMeta: TypeMetaT
  },
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
        cell: ({ getValue, table, row }) => {
          const namespace = getValue()

          if (!namespace) return null

          const { cluster } = table.options.meta as {
            cluster?: ClusterTinyFragment
          }

          return (
            <Link
              to={getResourceDetailsAbsPath(
                cluster?.id,
                'namespace',
                row.original.objectMeta.namespace!
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <InlineLink>{getValue()}</InlineLink>
            </Link>
          )
        },
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

export function useSortedTableOptions(
  options?: Omit<TableOptions<any>, 'data' | 'columns' | 'getCoreRowModel'>
) {
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

export function useKubernetesCluster() {
  const { clusterId } = useParams()

  const { data } = useClustersTinyQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  return useMemo(
    () => clusters.find(({ id }) => id === clusterId),
    [clusterId, clusters]
  )
}

// TODO: Add size to prop and use bigger version here, use medium chips as well then.
export function Metadata({ objectMeta }: { objectMeta?: Maybe<ObjectMetaT> }) {
  const theme = useTheme()

  if (!objectMeta) return null

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'row',
          gap: theme.spacing.xlarge,
        }}
      >
        <Prop title="Name">{objectMeta.name}</Prop>
        <Prop title="Namespace">{objectMeta.namespace}</Prop>
        <Prop title="UID">{objectMeta.uid}</Prop>
        <Prop title="Creation date">
          {moment(objectMeta.creationTimestamp).format('lll')}
        </Prop>
      </div>
      <Prop title="Labels">
        <ChipList
          size="small"
          limit={5}
          values={Object.entries(objectMeta.labels || {})}
          transformValue={(label) => label.join(': ')}
        />
      </Prop>
      <Prop title="Annotations">
        <ChipList
          size="small"
          limit={5}
          values={Object.entries(objectMeta.annotations || {})}
          transformValue={(annotation) => annotation.join(': ')}
        />
      </Prop>
    </Card>
  )
}
