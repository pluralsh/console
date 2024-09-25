import { ComponentProps, useMemo, useState } from 'react'
import {
  Button,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useNotificationRoutersQuery } from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import {
  NOTIFICATIONS_BASE_CRUMBS,
  NOTIFICATIONS_ROUTERS_ABS_PATH,
} from 'routes/settingsRoutesConst'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { columns } from './NotificationRoutersColumns'
import { CreateNotificationRouterModal } from './CreateNotificationRouterModal'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const crumbs = [
  ...NOTIFICATIONS_BASE_CRUMBS,
  {
    label: 'routers',
    url: NOTIFICATIONS_ROUTERS_ABS_PATH,
  },
]

function CreateRouterButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => setOpen(true)}
      >
        New router
      </Button>
      <CreateNotificationRouterModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

export default function NotificationRouters() {
  const theme = useTheme()

  useSetBreadcrumbs(crumbs)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useNotificationRoutersQuery,
    errorPolicy: 'all',
    keyPath: ['notificationRouters'],
  })

  useSetPageHeaderContent(useMemo(() => <CreateRouterButton />, []))

  if (error && !data?.notificationRouters) {
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
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.notificationRouters?.edges || []}
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
    </div>
  )
}
