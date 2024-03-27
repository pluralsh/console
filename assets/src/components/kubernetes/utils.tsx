import uniqWith from 'lodash/uniqWith'
import { ReactNode, useMemo, useState } from 'react'
import { ColumnHelper, SortingState, TableOptions } from '@tanstack/react-table'
import { ChipList, Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Link, useParams } from 'react-router-dom'
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
import {
  INGRESS_CLASSES_REL_PATH,
  getDiscoveryAbsPath,
  getKubernetesAbsPath,
  getResourceDetailsAbsPath,
} from '../../routes/kubernetesRoutesConsts'
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

export const getBaseBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  {
    label: 'kubernetes',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: cluster?.name ?? '',
    url: getKubernetesAbsPath(cluster?.id),
  },
]

export function MetadataSidecar({
  objectMeta,
  children,
}: {
  objectMeta?: Maybe<ObjectMetaT>
  children?: ReactNode
}) {
  return (
    <Sidecar heading="Metadata">
      {objectMeta && (
        <>
          <SidecarItem heading="Name">{objectMeta.name}</SidecarItem>
          {objectMeta.namespace && (
            <SidecarItem heading="Namespace">
              {objectMeta.namespace}
            </SidecarItem>
          )}
          <SidecarItem heading="UID">{objectMeta.uid}</SidecarItem>
          <SidecarItem heading="Creation date">
            {moment(objectMeta.creationTimestamp).format('lll')}
          </SidecarItem>
          <SidecarItem heading="Labels">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(objectMeta.labels || {})}
              transformValue={(label) => label.join(': ')}
              emptyState={<div>None</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Annotations">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(objectMeta.annotations || {})}
              transformValue={(annotation) => annotation.join(': ')}
              emptyState={<div>None</div>}
            />
          </SidecarItem>
        </>
      )}
      {children}
    </Sidecar>
  )
}
