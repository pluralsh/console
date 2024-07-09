import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import { byIso } from 'country-code-lookup'
import { Chloropleth } from 'components/utils/Chloropleth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useMemo } from 'react'
import { useAuditMetricsQuery } from 'generated/graphql'

import { AUDITS_ABS_PATH } from 'routes/settingsRoutesConst'

import { BREADCRUMBS } from '../usermanagement/UserManagement'

export default function AuditsMap() {
  const { data } = useAuditMetricsQuery({ fetchPolicy: 'cache-and-network' })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BREADCRUMBS,
        { label: 'audits', url: AUDITS_ABS_PATH },
        { label: 'map', url: `${AUDITS_ABS_PATH}/map` },
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
    <Card height={500}>
      <Chloropleth data={metrics} />
    </Card>
  )
}
