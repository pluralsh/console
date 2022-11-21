import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { DASHBOARDS_Q } from 'components/graphql/dashboards'

import { Div } from 'honorable'

import DashboardCard from './DashboardCard'

export default function Dashboards() {
  const { currentApplication }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const { data } = useQuery(DASHBOARDS_Q, {
    variables: { repo: currentApplication.name },
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: currentApplication.name, url: `/apps/${currentApplication.name}` },
    { text: 'Dashboards', url: `/apps/${currentApplication.name}/dashboards` },
  ]), [currentApplication, setBreadcrumbs])

  if (!data) return null

  const { dashboards } = data

  return (
    <Div>
      <PageTitle heading="Dashboards" />
      {dashboards.map(({ spec: { name, description } }) => (
        <DashboardCard
          name={name}
          description={description}
        />
      ))}
    </Div>
  )
}
