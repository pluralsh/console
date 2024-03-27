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
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  INGRESS_CLASSES_REL_PATH,
  getDiscoveryAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useKubernetesContext } from '../Kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  {
    label: 'kubernetes',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: cluster?.name ?? '',
    url: getKubernetesAbsPath(cluster?.id),
  },
  {
    label: 'discovery',
    url: getDiscoveryAbsPath(cluster?.id),
  },
  {
    label: 'ingress classes',
    url: `${getDiscoveryAbsPath(cluster?.id)}/${INGRESS_CLASSES_REL_PATH}`,
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
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colController, colLabels, colCreationTimestamp],
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
