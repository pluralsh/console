import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import { byIso } from 'country-code-lookup'
import { Chloropleth } from 'components/utils/Chloropleth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useMemo } from 'react'

import { useAuditMetricsQuery } from '../../../generated/graphql'
import { BREADCRUMBS } from '../Account'

export default function AuditsMap() {
  const { data } = useAuditMetricsQuery({ fetchPolicy: 'cache-and-network' })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BREADCRUMBS,
        { label: 'audits', url: '/account/audits' },
        { label: 'map', url: '/account/audits/map' },
      ],
      []
    )
  )

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
    <Card height="100%">
      <Chloropleth data={metrics} />
    </Card>
  )
}
