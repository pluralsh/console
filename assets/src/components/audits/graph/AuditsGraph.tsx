import { Card, LoopingLogo } from '@pluralsh/design-system'
import { Flex } from 'honorable'
import { useQuery } from '@apollo/client'
import { byIso } from 'country-code-lookup'
import { Chloropleth } from 'components/utils/Chloropleth'

import { AUDIT_METRICS } from '../queries'

export default function AuditsGraph() {
  const { data } = useQuery(AUDIT_METRICS, { fetchPolicy: 'cache-and-network' })

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

  const metrics = data.auditMetrics.map(({ country, count }) => ({
    id: byIso(country)?.iso3, value: count,
  }))

  return <Card height="calc(100vh - 244px)"><Chloropleth data={metrics} /></Card>
}
