import { useContext, useEffect } from 'react'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import { stringify } from 'yaml'
import { PageTitle } from '@pluralsh/design-system'

import { LoopingLogo } from 'components/utils/AnimatedLogo'
import { BreadcrumbsContext } from 'components/Breadcrumbs'

import { POLL_INTERVAL } from '../constants'
import { POD_RAW_Q } from '../queries'

import { RawPageCode } from '../RawPageCode'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      raw: string
    }
  }>(POD_RAW_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'nodes', url: '/nodes' },
      { text: name || '', url: `/nodes/${name}` },
    ])
  }, [name, setBreadcrumbs])

  if (!data) return <LoopingLogo dark />

  const {
    node: { raw },
  } = data

  const content = stringify(JSON.parse(raw))

  return (
    <>
      <PageTitle heading="Raw" />
      <RawPageCode>{content}</RawPageCode>
    </>
  )
}

