import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { LoopingLogo, PageTitle } from '@pluralsh/design-system'
import { useCallback, useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APPLICATIONS_Q } from 'components/graphql/plural'
import { useQuery } from 'react-apollo'
import { Flex } from 'honorable'
import { GqlError } from 'forge-core'

export default function Configuration() {
  const navigate = useNavigate()
  const { appName } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { data, error } = useQuery(APPLICATIONS_Q, {
    variables: { name: appName },
    fetchPolicy: 'network-only',
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onCompleted = useCallback(() => navigate('/'), [navigate])

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Configuration', url: `/apps/${appName}/config` },
  ]), [appName, setBreadcrumbs])

  if (error) {
    return (
      <Flex>
        <GqlError
          error={error}
          header="Cannot access configuration for this app"
        />
      </Flex>
    )
  }

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

  return (
    <PageTitle heading="Configuration" />
  )
}
