import { ComponentProps, useMemo } from 'react'
import {
  Breadcrumb,
  EmptyState,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import isEmpty from 'lodash/isEmpty'

import { useTheme } from 'styled-components'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import {
  BACKUPS_ABS_PATH,
  OBJECT_STORES_REL_PATH,
} from '../../../routes/backupRoutesConsts'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import { useObjectStoresQuery } from '../../../generated/graphql'

import { GqlError } from '../../utils/Alert'

import CreateObjectStore from './CreateObjectStore'
import { ColActions, ColName, ColProvider } from './ObjectStoreColumns'

const QUERY_PAGE_SIZE = 100

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const BACKUPS_OBJECT_STORES_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'object stores',
    url: `${BACKUPS_ABS_PATH}/${OBJECT_STORES_REL_PATH}`,
  },
]

export const columns = [ColProvider, ColName, ColActions]

export default function ObjectStores() {
  const theme = useTheme()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useObjectStoresQuery,
    pageSize: QUERY_PAGE_SIZE,
    queryKey: 'objectStores',
  })

  const objectStores = data?.objectStores

  const headerActions = useMemo(
    () => <CreateObjectStore refetch={refetch} />,
    [refetch]
  )

  useSetPageHeaderContent(headerActions)
  useSetBreadcrumbs(BACKUPS_OBJECT_STORES_BASE_CRUMBS)

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
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
      {!isEmpty(objectStores?.edges) ? (
        <FullHeightTableWrap>
          <Table
            loose
            columns={columns}
            reactTableOptions={{ meta: { refetch } }}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={objectStores?.edges || []}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any object storage connections yet." />
      )}
    </div>
  )
}
