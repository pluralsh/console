import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { Event as EventT } from 'generated/graphql'

import EventsTable from '../../../../utils/EventsTable'

export default function ComponentEvents() {
  const { appName, componentKind, componentName } = useParams()
  const outletContext = useOutletContext<object>() ?? {}
  const data = 'data' in outletContext ? (outletContext.data ?? {}) : {}
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
    { text: 'Events', url: `/apps/${appName}/components/${componentKind}/${componentName}/events` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value = Object.values(data).find(value => value !== undefined)
  const events: EventT[] = value?.events || []

  return (
    <>
      <PageTitle heading="Events" />
      <EventsTable events={events} />
    </>
  )
}
