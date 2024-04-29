import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Ingressclass_IngressClassList as IngressClassListT,
  Ingressclass_IngressClass as IngressClassT,
  IngressClassesQuery,
  IngressClassesQueryVariables,
  Maybe,
  useIngressClassesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  INGRESS_CLASSES_REL_PATH,
  getNetworkAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getNetworkBreadcrumbs } from './Network'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getNetworkBreadcrumbs(cluster),
  {
    label: 'ingress classes',
    url: `${getNetworkAbsPath(cluster?.id)}/${INGRESS_CLASSES_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<IngressClassT>()

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
    [colName, colLabels, colCreationTimestamp, colAction]
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
