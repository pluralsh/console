import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle, Table } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { Date } from 'components/utils/Date'

import { createColumnHelper } from '@tanstack/react-table'
import { Event as EventT } from 'generated/graphql'

const COLUMN_HELPER = createColumnHelper<EventT>()

const columns = [
  COLUMN_HELPER.accessor(event => event.type, {
    id: 'type',
    cell: type => type.getValue(),
    header: 'Type',
  }),
  COLUMN_HELPER.accessor(event => event.reason, {
    id: 'reason',
    cell: reason => reason.getValue(),
    header: 'Reason',
  }),
  COLUMN_HELPER.accessor(event => event.message, {
    id: 'message',
    cell: message => message.getValue(),
    header: 'Message',
  }),
  COLUMN_HELPER.accessor(event => event.count, {
    id: 'count',
    cell: count => count.getValue(),
    header: 'Count',
  }),
  COLUMN_HELPER.accessor(event => event.lastTimestamp, {
    id: 'lastTimestamp',
    cell: lastTimestamp => <Date date={lastTimestamp.getValue()} />,
    header: 'Last seen',
  }),
]

export default function ComponentEvents() {
  const { appName, componentKind, componentName } = useParams()
  const outletContext = useOutletContext<object>() ?? {}
  const data = 'data' in outletContext ? (outletContext.data ?? {}) : {}
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  console.log('outletContext', outletContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value = Object.values(data).find(value => value !== undefined)
  const events: EventT[] = value?.events || []

  return (
    <>
      <PageTitle heading="Events" />
      {events?.length > 0 && (
        <Table
          data={events}
          columns={columns}
          maxHeight="calc(100vh - 244px)"
        />
      )}
      {(!events || events.length === 0) && 'No events available.'}
    </>
  )
}
