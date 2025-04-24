import { Dispatch, DispatchWithoutAction, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import {
  Maybe,
  Secret_Secret as SecretT,
  Secret_SecretList as SecretListT,
  SecretsQuery,
  SecretsQueryVariables,
  useSecretsQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  getConfigurationAbsPath,
  SECRETS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { getConfigurationBreadcrumbs } from './Configuration'
import { useSetPageHeaderAction } from '../../cd/ContinuousDeployment.tsx'
import { CreateSecretButton } from '../common/create/secret/SecretButton.tsx'

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
  const [refetch, setRefetch] = useState<Dispatch<DispatchWithoutAction>>()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))
  useSetPageHeaderAction(
    <CreateSecretButton
      text="Create secret"
      refetch={refetch}
    />
  )

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
      setRefetch={setRefetch}
    />
  )
}
