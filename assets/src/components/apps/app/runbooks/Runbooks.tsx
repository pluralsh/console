import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { PageTitle, RunBookIcon } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { POLL_INTERVAL } from 'components/runbooks/constants'
import { RUNBOOKS_Q } from 'components/runbooks/queries'
import { useQuery } from 'react-apollo'
import { ListItem } from 'components/apps/misc'
import { Flex } from 'honorable'

export default function Runbooks() {
  const navigate = useNavigate()
  const { appName } = useParams()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const { data } = useQuery(RUNBOOKS_Q, {
    variables: { namespace: appName },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Runbooks', url: `/apps/${appName}/runbooks` },
  ]), [appName, setBreadcrumbs])

  if (!data) return null

  const { runbooks } = data

  console.log(runbooks)

  return (
    <Flex direction="column">
      <PageTitle heading="Runbooks" />
      {runbooks.map(({ id, spec: { name, description } }) => (
        <ListItem
          key={id}
          title={name}
          description={description}
          icon={<RunBookIcon />}
          onClick={() => navigate(`/apps/${appName}/runbooks/${id}`)}
        />
      ))}
    </Flex>
  )
}
