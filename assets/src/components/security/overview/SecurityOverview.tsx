import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  SECURITY_ABS_PATH,
  SECURITY_OVERVIEW_ABS_PATH,
  SECURITY_OVERVIEW_REL_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import {
  SecurityOverviewHeatmapCard,
  SecurityOverviewPieCharts,
} from './SecurityOverviewCharts'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  {
    label: SECURITY_OVERVIEW_REL_PATH,
    url: SECURITY_OVERVIEW_ABS_PATH,
  },
]

export function SecurityOverview() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      gap="large"
      direction="column"
    >
      <SecurityOverviewPieCharts />
      <SecurityOverviewHeatmapCard />
    </Flex>
  )
}
