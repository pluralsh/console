import uniqWith from 'lodash/uniqWith'
import React, { ReactNode, useMemo, useState } from 'react'
import { ColumnHelper, SortingState, TableOptions } from '@tanstack/react-table'
import { Chip, ChipList, Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Link, useParams } from 'react-router-dom'
import moment from 'moment/moment'

import yaml from 'js-yaml'

import { capitalize } from 'lodash'

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
  getKubernetesAbsPath,
  getResourceDetailsAbsPath,
} from '../../routes/kubernetesRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'

import { ResourceT } from './ResourceList'
import Annotations from './common/Annotations'

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

const resourceConditionSeverity = {
  true: 'success',
  false: 'error',
  unknown: 'warning',
}

export function ResourceReadyChip({
  ready,
}: {
  ready: string | boolean | undefined
}) {
  if (ready === undefined) return undefined

  const r = ready.toString()
  const severity = resourceConditionSeverity[r.toLowerCase()] ?? 'info'

  return (
    <Chip
      size="small"
      severity={severity}
    >
      {capitalize(r)}
    </Chip>
  )
}

export function ResourceLink({
  name,
  namespace,
  kind,
  emptyState = 'None',
}: {
  name?: Maybe<string>
  namespace?: Maybe<string>
  kind: string
  emptyState?: string
}) {
  const { clusterId } = useParams()

  if (!name) return emptyState

  return (
    <Link to={getResourceDetailsAbsPath(clusterId, kind, name, namespace)}>
      <InlineLink>
        {namespace}
        {namespace && '/'}
        {name}
      </InlineLink>
    </Link>
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

// TODO: Export type from design system
type CodeTabData = {
  key: string
  label?: string
  language?: string
  content: string
}

export const useCodeTabs = (obj: Nullable<object>): Array<CodeTabData> =>
  useMemo(
    () =>
      obj
        ? [
            {
              key: 'yaml',
              label: 'YAML',
              language: 'yaml',
              content: yaml.dump(obj),
            },
            {
              key: 'json',
              label: 'JSON',
              language: 'json',
              content: JSON.stringify(obj, null, 2),
            },
          ]
        : [],
    [obj]
  )

export function MetadataSidecar({
  resource,
  children,
}: {
  resource?: Maybe<ResourceT>
  children?: ReactNode
}) {
  const objectMeta = resource?.objectMeta
  const typeMeta = resource?.typeMeta

  return (
    <Sidecar heading={typeMeta?.kind ?? 'Metadata'}>
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
            <Annotations annotations={objectMeta?.annotations} />
          </SidecarItem>
        </>
      )}
      {children}
    </Sidecar>
  )
}
