import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  IngressclassIngressClass,
  IngressclassIngressClassList,
} from '../../../generated/kubernetes'
import { getIngressClassesInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen'
import {
  getNetworkAbsPath,
  INGRESS_CLASSES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getNetworkBreadcrumbs } from './Network'

export const getBreadcrumbs = (
  cluster?: KubernetesClusterFragment | null | undefined
) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'ingress classes',
    url: `${getNetworkAbsPath(cluster?.id)}/${INGRESS_CLASSES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<IngressclassIngressClass>()

const colController = columnHelper.accessor(
  (ingressClass) => ingressClass.controller,
  {
    id: 'controller',
    header: 'Controller',
    cell: ({ getValue }) => getValue(),
  }
)

export default function IngressClasses() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colController, colLabels, colCreationTimestamp, colAction],
    [colName, colController, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<IngressclassIngressClassList, IngressclassIngressClass>
      columns={columns}
      queryOptions={getIngressClassesInfiniteOptions}
      itemsKey="items"
    />
  )
}
