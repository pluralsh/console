import { ReactElement } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

import {
  Horizontalpodautoscaler_HorizontalPodAutoscalerList as HorizontalPodAutoscalerListT,
  Horizontalpodautoscaler_HorizontalPodAutoscaler as HorizontalPodAutoscalerT,
  HorizontalPodAutoscalersQuery,
  HorizontalPodAutoscalersQueryVariables,
  useHorizontalPodAutoscalersQuery,
} from '../../../generated/graphql-kubernetes'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<HorizontalPodAutoscalerT>()

const COLUMNS = [
  columnHelper.accessor((hpa) => hpa?.objectMeta?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((hpa) => hpa?.minReplicas, {
    id: 'minreplicas',
    header: 'Min Replicas',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((hpa) => hpa?.maxReplicas, {
    id: 'maxreplicas',
    header: 'Max Replicas',
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
          <InlineLink>{ref?.name}</InlineLink>
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

interface HorizontalPodAutoscalersProps {
  kind: string
  namespace: string
  name: string
}

export default function HorizontalPodAutoscalers({
  kind,
  namespace,
  name,
}: HorizontalPodAutoscalersProps): ReactElement {
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
      queryOptions={{
        variables: {
          kind,
          namespace,
          name,
        } as HorizontalPodAutoscalersQueryVariables,
      }}
      queryName="handleGetHorizontalPodAutoscalerListForResource"
      itemsKey="horizontalpodautoscalers"
      disableOnRowClick
    />
  )
}
