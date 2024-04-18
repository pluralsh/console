import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import {
  Maybe,
  Secret_SecretList as SecretListT,
  Secret_Secret as SecretT,
  SecretsQuery,
  SecretsQueryVariables,
  useSecretsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  SECRETS_REL_PATH,
  getConfigurationAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getConfigurationBreadcrumbs } from './Configuration'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getConfigurationBreadcrumbs(cluster),
  {
    label: 'secrets',
    url: `${getConfigurationAbsPath(cluster?.id)}/${SECRETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<SecretT>()

const colType = columnHelper.accessor((secret) => secret.type, {
  id: 'type',
  header: 'Type',
  cell: ({ getValue }) => getValue(),
})

export default function Secrets() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

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
    <ResourceList<SecretListT, SecretT, SecretsQuery, SecretsQueryVariables>
      namespaced
      columns={columns}
      query={useSecretsQuery}
      queryName="handleGetSecretList"
      itemsKey="secrets"
    />
  )
}
