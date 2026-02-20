import { ClusterScalingRecommendationFragment } from 'generated/graphql'

import { Table } from '@pluralsh/design-system'
import { useServiceContext } from './ServiceDetailsContext'

import {
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColName,
  ColScalingPr,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
export function ServiceScalingRecs() {
  const { service, isLoading } = useServiceContext()

  const recommendations =
    service?.scalingRecommendations?.filter(
      (rec): rec is ClusterScalingRecommendationFragment => !!rec
    ) ?? []

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      loading={isLoading}
      fillLevel={1}
      rowBg="base"
      columns={cols}
      data={recommendations}
    />
  )
}

const cols = [
  ColName,
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColScalingPr,
]
