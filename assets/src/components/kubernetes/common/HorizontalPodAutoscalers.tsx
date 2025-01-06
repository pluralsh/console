import { ReactElement } from 'react'

import {
  Horizontalpodautoscaler_HorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
  Horizontalpodautoscaler_HorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  HorizontalPodAutoscalersForResourceQuery,
  HorizontalPodAutoscalersForResourceQueryVariables,
  useHorizontalPodAutoscalersForResourceQuery,
} from '../../../generated/graphql-kubernetes'
import { useHorizontalPodAutoscalersColumns } from '../cluster/HorizontalPodAutoscalers'

import { ResourceList } from './ResourceList'
import { Kind } from './types'

interface HorizontalPodAutoscalersProps {
  kind: Kind
  namespace: string
  name: string
}

export default function HorizontalPodAutoscalersForResource({
  kind,
  namespace,
  name,
}: HorizontalPodAutoscalersProps): ReactElement<any> {
  const columns = useHorizontalPodAutoscalersColumns()

  return (
    <ResourceList<
      HorizontalPodAutoscalerListT,
      HorizontalPodAutoscalerT,
      HorizontalPodAutoscalersForResourceQuery,
      HorizontalPodAutoscalersForResourceQueryVariables
    >
      namespaced
      columns={columns}
      query={useHorizontalPodAutoscalersForResourceQuery}
      queryOptions={{
        variables: {
          kind,
          namespace,
          name,
        } as HorizontalPodAutoscalersForResourceQueryVariables,
      }}
      queryName="handleGetHorizontalPodAutoscalerListForResource"
      itemsKey="horizontalpodautoscalers"
      disableOnRowClick
    />
  )
}
