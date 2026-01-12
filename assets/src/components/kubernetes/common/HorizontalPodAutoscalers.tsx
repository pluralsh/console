import { ReactElement } from 'react'

import { getHorizontalPodAutoscalersForResourceInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen'
import { useHorizontalPodAutoscalersColumns } from '../cluster/HorizontalPodAutoscalers'

import { UpdatedResourceList } from './UpdatedResourceList'
import { Kind } from './types'
import {
  HorizontalpodautoscalerHorizontalPodAutoscaler,
  HorizontalpodautoscalerHorizontalPodAutoscalerList,
} from 'generated/kubernetes'

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
    <UpdatedResourceList<
      HorizontalpodautoscalerHorizontalPodAutoscalerList,
      HorizontalpodautoscalerHorizontalPodAutoscaler
    >
      namespaced
      columns={columns}
      queryOptions={getHorizontalPodAutoscalersForResourceInfiniteOptions}
      pathParams={{ kind, name, namespace }}
      disableOnRowClick
    />
  )
}
