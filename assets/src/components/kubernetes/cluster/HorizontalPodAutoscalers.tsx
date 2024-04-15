import { ReactElement } from 'react'

import { Link } from 'react-router-dom'

import { createColumnHelper } from '@tanstack/react-table'

import { ResourceList } from '../common/ResourceList'
import {
  Horizontalpodautoscaler_HorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
  Horizontalpodautoscaler_HorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  HorizontalPodAutoscalersQuery,
  HorizontalPodAutoscalersQueryVariables,
  useHorizontalPodAutoscalersQuery,
} from '../../../generated/graphql-kubernetes'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

const columnHelper = createColumnHelper<HorizontalPodAutoscalerT>()

const COLUMNS = [
  columnHelper.accessor((hpa) => hpa?.objectMeta?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((hpa) => hpa?.minReplicas, {
    id: 'minReplicas',
    header: 'Min replicas',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((hpa) => hpa?.maxReplicas, {
    id: 'maxReplicas',
    header: 'Max replicas',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((hpa) => hpa, {
    id: 'reference',
    header: 'Reference',
    cell: ({ getValue, table }) => {
      const { cluster } = table.options.meta as {
        cluster?: ClusterTinyFragment
      }
      const hpa = getValue()
      const ref = hpa?.scaleTargetRef

      return (
        <Link
          to={getResourceDetailsAbsPath(
            cluster?.id,
            ref?.kind?.toLowerCase(),
            ref?.name,
            hpa?.objectMeta?.namespace
          )}
        >
          <InlineLink>
            {ref?.kind?.toLowerCase()}/{ref?.name}
          </InlineLink>
        </Link>
      )
    },
  }),
  columnHelper.accessor((hpa) => hpa?.objectMeta?.creationTimestamp, {
    id: 'creationTimestamp',
    header: 'Creation',
    enableSorting: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export function useHorizontalPodAutoscalersColumns(): Array<object> {
  return COLUMNS
}

export default function HorizontalPodAutoscalers(): ReactElement {
  return (
    <ResourceList<
      HorizontalPodAutoscalerListT,
      HorizontalPodAutoscalerT,
      HorizontalPodAutoscalersQuery,
      HorizontalPodAutoscalersQueryVariables
    >
      namespaced
      columns={COLUMNS}
      query={useHorizontalPodAutoscalersQuery}
      queryName="handleGetHorizontalPodAutoscalerList"
      itemsKey="horizontalpodautoscalers"
      disableOnRowClick
    />
  )
}
