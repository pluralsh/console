import { ComponentProps, useMemo, useState } from 'react'
import {
  Button,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useNotificationSinksQuery } from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import {
  NOTIFICATIONS_BASE_CRUMBS,
  NOTIFICATIONS_SINKS_ABS_PATH,
} from 'routes/settingsRoutesConst'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { columns } from './NotificationSinksColumns'
import { CreateNotificationSinkModal } from './UpsertNotificationSinkModal'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const crumbs = [
  ...NOTIFICATIONS_BASE_CRUMBS,
  {
    label: 'sinks',
    url: NOTIFICATIONS_SINKS_ABS_PATH,
  },
]

export default function NotificationSinks() {
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
    queryHook: useNotificationSinksQuery,
    keyPath: ['notificationSinks'],
  })

  useSetPageHeaderContent(useMemo(() => <CreateSinkButton />, []))

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
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.notificationSinks?.edges || []}
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

function CreateSinkButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => {
          setOpen(true)
        }}
      >
        New sink
      </Button>
      <CreateNotificationSinkModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
