import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment, Maybe } from '../../../generated/graphql'
import { SecretSecret, SecretSecretList } from '../../../generated/kubernetes'
import {
  getAllSecretsInfiniteOptions,
  getSecretsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  getConfigurationAbsPath,
  SECRETS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderAction } from '../../cd/ContinuousDeployment.tsx'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { CreateSecretButton } from '../common/create/secret/SecretButton.tsx'
import { ResourceList } from '../common/ResourceList.tsx'
import { useDefaultColumns } from '../common/utils'

import { getConfigurationBreadcrumbs } from './Configuration'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getConfigurationBreadcrumbs(cluster),
  {
    label: 'secrets',
    url: `${getConfigurationAbsPath(cluster?.id)}/${SECRETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<SecretSecret>()

const colType = columnHelper.accessor((secret) => secret.type, {
  id: 'type',
  header: 'Type',
  cell: ({ getValue }) => getValue(),
})

export default function Secrets() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))
  useSetPageHeaderAction(<CreateSecretButton text="Create secret" />)

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colType,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<SecretSecretList, SecretSecret>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getSecretsInfiniteOptions
          : getAllSecretsInfiniteOptions
      }
      itemsKey="secrets"
    />
  )
}
