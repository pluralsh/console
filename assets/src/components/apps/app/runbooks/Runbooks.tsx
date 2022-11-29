import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { EmptyState, PageTitle, RunBookIcon } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { POLL_INTERVAL } from 'components/runbooks/constants'
import { RUNBOOKS_Q } from 'components/runbooks/queries'
import { useQuery } from 'react-apollo'
import { ListItem } from 'components/apps/misc'
import { A, Div, Flex } from 'honorable'

export const getBorderColor = status => (status?.alerts?.length > 0 ? 'border-warning' : '')

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

  return (
    <Flex direction="column">
      <PageTitle heading="Runbooks" />
      {runbooks.map(({ id, spec: { name, description }, status }) => (
        <ListItem
          key={id}
          title={name}
          description={description}
          icon={<RunBookIcon />}
          borderColor={getBorderColor(status)}
          onClick={() => navigate(`/apps/${appName}/runbooks/${id}`)}
        />
      ))}
      {runbooks?.length < 1 && (
        <Flex justify="center">
          <EmptyState
            marginTop={96}
            width={600}
            icon={<RunBookIcon size={64} />}
            message="No runbooks available"
            description={(
              <>
                <Div>If you're interested in adding runbooks to this application,&nbsp;</Div>
                <Div>
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
