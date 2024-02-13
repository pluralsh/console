import { ComponentProps, useMemo, useState } from 'react'
import {
  Breadcrumb,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import isEmpty from 'lodash/isEmpty'

import { useTheme } from 'styled-components'

import { TableState, createColumnHelper } from '@tanstack/react-table'

import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import {
  BACKUPS_ABS_PATH,
  OBJECT_STORES_REL_PATH,
} from '../../../routes/backupRoutesConsts'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ObjectStore, useObjectStoresQuery } from '../../../generated/graphql'
import { Edge } from '../../../utils/graphql'
import { ColWithIcon } from '../../utils/table/ColWithIcon'

import { GqlError } from '../../utils/Alert'

import CreateObjectStore from './CreateObjectStore'
import {
  ObjectStoreCloudIcon,
  getObjectStoreCloud,
  objectStoreCloudToDisplayName,
} from './utils'
import { DeleteObjectStore } from './DeleteObjectStore'
import UpdateObjectStore from './UpdateObjectStore'

const POLL_INTERVAL = 10 * 1000

const BACKUPS_OBJECT_STORES_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'object stores',
    url: `${BACKUPS_ABS_PATH}/${OBJECT_STORES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<Edge<ObjectStore>>()

export const columns = [
  columnHelper.accessor(({ node }) => node, {
    id: 'provider',
    header: 'Provider',
    meta: { gridTemplate: `240px` },
    cell: ({ getValue }) => {
      const cloud = getObjectStoreCloud(getValue())

      if (!cloud) return null

      return (
        <ColWithIcon
          truncateLeft
          icon={<ObjectStoreCloudIcon cloud={cloud} />}
        >
          {objectStoreCloudToDisplayName[cloud]}
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Storage name',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.id, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({
      table,
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const { refetch } = table.options.meta as { refetch?: () => void }

      return (
        node && (
          <div
            css={{
              display: 'flex',
              flexGrow: 0,
              gap: theme.spacing.medium,
              alignItems: 'center',
              alignSelf: 'end',
            }}
          >
            <UpdateObjectStore
              objectStore={node}
              refetch={refetch}
            />
            <DeleteObjectStore
              objectStore={node}
              refetch={refetch}
            />
          </div>
        )
      )
    },
  }),
]

export default function ObjectStores() {
  const theme = useTheme()

  const { data, error, refetch } = useObjectStoresQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  }) // TODO: Pagination.

  const headerActions = useMemo(
    () => <CreateObjectStore refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_OBJECT_STORES_BASE_CRUMBS)

  const [tableFilters, _] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
        meta: { refetch },
      }),
      [tableFilters, refetch]
    )

  if (error) {
    return (
      <GqlError
        header="Something went wrong"
        error={error}
      />
    )
  }

  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {!isEmpty(data?.objectStores?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.objectStores?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
            loose
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any object storage connections yet." />
      )}
    </div>
  )
}
