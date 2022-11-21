import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { DashboardIcon, EmptyState, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { DASHBOARDS_Q } from 'components/graphql/dashboards'

import { A, Div, Flex } from 'honorable'

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
    <Flex direction="column">
      <PageTitle heading="Dashboards" />
      {dashboards.map(({ spec: { name, description } }) => (
        <DashboardCard
          name={name}
          description={description}
        />
      ))}
      {dashboards?.length < 1 && (
        <Flex justify="center">
          <EmptyState
            marginTop={96}
            width={500}
            icon={<DashboardIcon size={64} />}
            message="No dashboards available"
            description={(
              <>
                <Div>If you're interested in adding your dashboards to this</Div>
                <Div>
                  application,&nbsp;
                  <A
                    inline
                    href="https://www.plural.sh/community"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    visit our docs
                  </A>
                &nbsp;for more details.
                </Div>
              </> as any // Workaround as JSX elements are not allowed here.
            )}
          />
        </Flex>
      )}
    </Flex>
  )
}
