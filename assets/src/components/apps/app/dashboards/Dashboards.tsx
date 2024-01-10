import {
  DashboardIcon,
  EmptyState,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { DASHBOARDS_Q } from 'components/graphql/dashboards'

import { A, Flex } from 'honorable'

import { useNavigate, useParams } from 'react-router-dom'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { ListItem } from '../misc'

export default function Dashboards() {
  const navigate = useNavigate()
  const { appName } = useParams()
  const { data } = useQuery(DASHBOARDS_Q, {
    variables: { repo: appName },
    fetchPolicy: 'cache-and-network',
  })

  const breadcrumbs = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'dashboards', url: `/apps/${appName}/dashboards` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (!data) return null

  const { dashboards } = data

  return (
    <ScrollablePage heading="Dashboards">
      {dashboards.map(({ id, spec: { name, description } }) => (
        <ListItem
          key={id}
          title={name}
          description={description}
          icon={<DashboardIcon />}
          onClick={() => navigate(`/apps/${appName}/dashboards/${id}`)}
        />
      ))}
      {dashboards?.length < 1 && (
        <Flex justify="center">
          <EmptyState
            css={{
              marginTop: 96,
              width: 500,
            }}
            icon={<DashboardIcon size={64} />}
            message="No dashboards available"
            description={
              (
                <div>
                  If you're interested in adding your dashboards to this
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
                </div>
              ) as any // Workaround as JSX elements are not allowed here.
            }
          />
        </Flex>
      )}
    </ScrollablePage>
  )
}
