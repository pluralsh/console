import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  EmptyState,
  LoopingLogo,
  PageTitle,
  RunBookIcon,
} from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { POLL_INTERVAL } from 'components/runbooks/constants'
import { RUNBOOKS_Q } from 'components/runbooks/queries'
import { useQuery } from 'react-apollo'
import { ListItem } from 'components/apps/misc'
import { A, Div, Flex } from 'honorable'

import { getBorderColor } from './misc'
import RunbookStatus from './runbook/RunbookStatus'

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
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'runbooks', url: `/apps/${appName}/runbooks` },
  ]), [appName, setBreadcrumbs])

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const { runbooks } = data

  return (
    <Flex direction="column">
      <PageTitle heading="Runbooks" />
      {runbooks.map(runbook => (
        <ListItem
          key={runbook.name}
          title={runbook.spec.name}
          description={runbook.spec.description}
          icon={<RunBookIcon />}
          borderColor={getBorderColor(runbook)}
          chips={(
            <RunbookStatus
              runbook={runbook}
              fontWeight={600}
            />
          )}
          onClick={() => navigate(`/apps/${appName}/runbooks/${runbook.name}`)}
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
