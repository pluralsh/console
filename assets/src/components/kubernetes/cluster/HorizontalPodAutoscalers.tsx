import { ReactElement, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { ResourceList } from '../common/ResourceList'
import {
  Horizontalpodautoscaler_HorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
  Horizontalpodautoscaler_HorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  HorizontalPodAutoscalersQuery,
  HorizontalPodAutoscalersQueryVariables,
  useHorizontalPodAutoscalersQuery,
} from '../../../generated/graphql-kubernetes'
import { toKind } from '../common/types'
import ResourceLink from '../common/ResourceLink'
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
    <ResourceList<
      HorizontalPodAutoscalerListT,
      HorizontalPodAutoscalerT,
      HorizontalPodAutoscalersQuery,
      HorizontalPodAutoscalersQueryVariables
    >
      namespaced
      columns={columns}
      query={useHorizontalPodAutoscalersQuery}
      queryName="handleGetHorizontalPodAutoscalerList"
      itemsKey="horizontalpodautoscalers"
      disableOnRowClick
    />
  )
}
