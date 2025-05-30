import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Ingressclass_IngressClass as IngressClassT,
  Ingressclass_IngressClassList as IngressClassListT,
  IngressClassesDocument,
  IngressClassesQuery,
  IngressClassesQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  getNetworkAbsPath,
  INGRESS_CLASSES_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

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
      queryDocument={IngressClassesDocument}
      queryName="handleGetIngressClassList"
      itemsKey="items"
    />
  )
}
