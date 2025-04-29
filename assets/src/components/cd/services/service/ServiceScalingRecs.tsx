import { ClusterScalingRecommendationFragment } from 'generated/graphql'

import { Table } from '@pluralsh/design-system'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from 'components/utils/table/useFetchPaginatedData'
import { useServiceContext } from './ServiceDetails'

import {
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColName,
  ColScalingPr,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
export function ServiceScalingRecs() {
  const { service } = useServiceContext()

  const recommendations =
    service.scalingRecommendations?.filter(
      (rec): rec is ClusterScalingRecommendationFragment => !!rec
    ) ?? []

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={1}
      rowBg="base"
      columns={cols}
      data={recommendations}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
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
