import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import { Chloropleth } from 'components/utils/Chloropleth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { byIso } from 'country-code-lookup'
import { useAuditMetricsQuery } from 'generated/graphql'
import { useMemo } from 'react'

import { AUDITS_ABS_PATH } from 'routes/settingsRoutesConst'

import { AUDITS_BREADCRUMBS } from './Audits'

const breadcrumbs = [
  ...AUDITS_BREADCRUMBS,
  { label: 'map', url: `${AUDITS_ABS_PATH}/map` },
]

export default function AuditsMap() {
  const { data } = useAuditMetricsQuery({ fetchPolicy: 'cache-and-network' })

  useSetBreadcrumbs(breadcrumbs)

  const metrics = useMemo(
    () =>
      data?.auditMetrics?.map((metrics) => ({
        id: byIso(metrics?.country ?? '')?.iso3,
        value: metrics?.count,
      })),
    [data]
  )

  if (!data) return <LoadingIndicator />

  return (
    <Card height={500}>
      <Chloropleth data={metrics} />
    </Card>
  )
}
