import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Ingressclass_IngressClassList as IngressClassListT,
  Ingressclass_IngressClass as IngressClassT,
  IngressClassesQuery,
  IngressClassesQueryVariables,
  useIngressClassesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<IngressClassT>()

export default function IngressClasses() {
  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colLabels, colCreationTimestamp],
    [colName, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      IngressClassListT,
      IngressClassT,
      IngressClassesQuery,
      IngressClassesQueryVariables
    >
      columns={columns}
      query={useIngressClassesQuery}
      queryName="handleGetIngressClassList"
      itemsKey="items"
    />
  )
}
