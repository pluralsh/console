import { ClusterScalingRecommendationFragment } from 'generated/graphql'

import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from 'components/utils/table/useFetchPaginatedData'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CD_REL_PATH } from 'routes/cdRoutesConsts'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

import {
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColName,
  ColScalingPr,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
export function ServiceScalingRecs() {
  const { service } = useServiceContext()
  const { serviceId, clusterId } = useParams()

  const breadcrumbs = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster ?? { id: clusterId ?? '' },
        service: service ?? { id: serviceId ?? '' },
      }),
      {
        label: 'recommendations',
        url: `${CD_REL_PATH}/services/${serviceId}/recommendations`,
      },
    ],
    [clusterId, service, serviceId]
  )
  useSetBreadcrumbs(breadcrumbs)

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
