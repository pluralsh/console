import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement, useMemo } from 'react'
import {
  HorizontalpodautoscalerHorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  HorizontalpodautoscalerHorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
} from '../../../generated/kubernetes'
import { getHorizontalPodAutoscalersInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen'
import ResourceLink from '../common/ResourceLink'

import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { toKind } from '../common/types'
import { useDefaultColumns } from '../common/utils'

const columnHelper = createColumnHelper<HorizontalPodAutoscalerT>()

const COLUMNS = {
  colMinReplicas: columnHelper.accessor((hpa) => hpa?.minReplicas, {
    id: 'minReplicas',
    header: 'Min replicas',
    cell: ({ getValue }) => getValue(),
  }),
  colMaxReplicas: columnHelper.accessor((hpa) => hpa?.maxReplicas, {
    id: 'maxReplicas',
    header: 'Max replicas',
    cell: ({ getValue }) => getValue(),
  }),
  colReference: columnHelper.accessor((hpa) => hpa, {
    id: 'reference',
    header: 'Reference',
    cell: ({ getValue }) => {
      const hpa = getValue()
      const ref = hpa?.scaleTargetRef

      return (
        <ResourceLink
          full
          objectRef={{
            kind: toKind(ref?.kind),
            namespace: hpa?.objectMeta?.namespace,
            name: ref?.name,
          }}
        />
      )
    },
  }),
}

export function useHorizontalPodAutoscalersColumns(): Array<object> {
  const { colAction, colName, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const { colMinReplicas, colMaxReplicas, colReference } = COLUMNS

  return useMemo(
    () => [
      colName,
      colMinReplicas,
      colMaxReplicas,
      colReference,
      colCreationTimestamp,
      colAction,
    ],
    [
      colName,
      colMinReplicas,
      colMaxReplicas,
      colReference,
      colCreationTimestamp,
      colAction,
    ]
  )
}

export default function HorizontalPodAutoscalers(): ReactElement<any> {
  const columns = useHorizontalPodAutoscalersColumns()

  return (
    <UpdatedResourceList<HorizontalPodAutoscalerListT, HorizontalPodAutoscalerT>
      namespaced
      columns={columns}
      queryOptions={getHorizontalPodAutoscalersInfiniteOptions}
      itemsKey="horizontalpodautoscalers"
      disableOnRowClick
    />
  )
}
