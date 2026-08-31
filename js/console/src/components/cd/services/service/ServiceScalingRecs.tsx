import { ClusterScalingRecommendationFragment } from 'generated/graphql'
import { useMemo } from 'react'

import { Table } from '@pluralsh/design-system'
import { useServiceContext } from './ServiceDetailsContext'

import {
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColName,
  getColScalingPr,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
export function ServiceScalingRecs() {
  const { service, isLoading } = useServiceContext()

  const recommendations =
    service?.scalingRecommendations?.filter(
      (rec): rec is ClusterScalingRecommendationFragment => !!rec
    ) ?? []
  const cols = useMemo(
    () =>
      service?.cluster
        ? [
            ColName,
            ColContainer,
            ColCpuChange,
            ColMemoryChange,
            getColScalingPr(service.cluster),
          ]
        : [ColName, ColContainer, ColCpuChange, ColMemoryChange],
    [service?.cluster]
  )

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
