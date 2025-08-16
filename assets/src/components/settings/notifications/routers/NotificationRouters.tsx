import {
  Button,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { useNotificationRoutersQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import {
  NOTIFICATIONS_BASE_CRUMBS,
  NOTIFICATIONS_ROUTERS_ABS_PATH,
} from 'routes/settingsRoutesConst'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { CreateNotificationRouterModal } from './CreateNotificationRouterModal'
import { columns } from './NotificationRoutersColumns'

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
      <Table
        fullHeightWrap
        columns={columns}
        reactTableOptions={{ meta: { refetch } }}
        data={data?.notificationRouters?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </div>
  )
}
