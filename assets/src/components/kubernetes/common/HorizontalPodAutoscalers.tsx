import { ReactElement } from 'react'

import {
  Horizontalpodautoscaler_HorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  Horizontalpodautoscaler_HorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
  HorizontalPodAutoscalersForResourceDocument,
  HorizontalPodAutoscalersForResourceQuery,
  HorizontalPodAutoscalersForResourceQueryVariables,
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
      queryDocument={HorizontalPodAutoscalersForResourceDocument}
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
