import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle, Table } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { Date } from 'components/utils/Date'

import { createColumnHelper } from '@tanstack/react-table'

const COLUMN_HELPER = createColumnHelper<any>()

const columns = [
  COLUMN_HELPER.accessor(event => event.type, {
    id: 'type',
    cell: (type: any) => type.getValue(),
    header: 'Type',
  }),
  COLUMN_HELPER.accessor(event => event.reason, {
    id: 'reason',
    cell: (reason: any) => reason.getValue(),
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor(event => event.message, {
    id: 'message',
    cell: (message: any) => message.getValue(),
    header: 'Message',
  }),
  COLUMN_HELPER.accessor(event => event.count, {
    id: 'count',
    cell: (count: any) => count.getValue(),
    header: 'Count',
  }),
  COLUMN_HELPER.accessor(event => event.lastTimestamp, {
    id: 'lastTimestamp',
    cell: (lastTimestamp: any) => <Date date={lastTimestamp.getValue()} />,
    header: 'Last seen',
  }),
]

export default function ComponentEvents() {
  const { appName, componentKind, componentName } = useParams()
  const { data } = useOutletContext<any>()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = Object.values(data).find(value => value !== undefined)

  return (
    <>
      <PageTitle heading="Events" />
      <Table
        data={value?.events}
        columns={columns}
        maxHeight="calc(100vh - 244px)"
      />
    </>
  )
}
