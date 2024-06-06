import { Card } from '@pluralsh/design-system'
import { useQuery } from '@apollo/client'
import { byIso } from 'country-code-lookup'
import { Chloropleth } from 'components/utils/Chloropleth'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { AUDIT_METRICS } from '../queries'

export default function AuditsGraph() {
  const { data } = useQuery(AUDIT_METRICS, { fetchPolicy: 'cache-and-network' })

  if (!data) return <LoadingIndicator />

  const metrics = data.auditMetrics.map(({ country, count }) => ({
    id: byIso(country)?.iso3,
    value: count,
  }))

  return (
    <Card height="100%">
      <Chloropleth data={metrics} />
    </Card>
  )
}
