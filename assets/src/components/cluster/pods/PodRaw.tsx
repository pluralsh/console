import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import { stringify } from 'yaml'
import { PageTitle } from '@pluralsh/design-system'

import { LoopingLogo } from 'components/utils/AnimatedLogo'

import { Pod } from 'generated/graphql'

import { POLL_INTERVAL } from '../constants'
import { POD_RAW_Q } from '../queries'

import { RawPageCode } from '../RawPageCode'

export default function NodeEvents() {
  const { name, namespace } = useParams()
  const { data, refetch: _refetch, error } = useQuery<{
    pod: Pod,
  }>(POD_RAW_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoopingLogo dark />

  const {
    pod: { raw },
  } = data

  const content = stringify(JSON.parse(raw))

  return (
    <>
      <PageTitle heading="Raw" />
      <RawPageCode>{content}</RawPageCode>
    </>
  )
}

