import { useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import { stringify } from 'yaml'
import { LoopingLogo, PageTitle } from '@pluralsh/design-system'

import { POLL_INTERVAL } from '../constants'
import { NODE_RAW_Q } from '../queries'
import { RawPageCode } from '../RawPageCode'

export default function NodeEvents() {
  const { name } = useParams()
  const { data, refetch: _refetch } = useQuery<{
    node: {
      raw: string
    }
  }>(NODE_RAW_Q, {
    variables: { name },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoopingLogo />

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
