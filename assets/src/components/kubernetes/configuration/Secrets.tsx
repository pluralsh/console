import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  Maybe,
  Secret_Secret as SecretT,
  Secret_SecretList as SecretListT,
  SecretsDocument,
  SecretsQuery,
  SecretsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getConfigurationAbsPath,
  SECRETS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderAction } from '../../cd/ContinuousDeployment.tsx'
import { useCluster } from '../Cluster'
import { CreateSecretButton } from '../common/create/secret/SecretButton.tsx'
import { ResourceList } from '../common/ResourceList'

import { useDefaultColumns } from '../common/utils'

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
  const [refetch, setRefetch] = useState<any>()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))
  useSetPageHeaderAction(
    <CreateSecretButton
      text="Create secret"
      refetch={refetch!}
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
      queryDocument={SecretsDocument}
      queryName="handleGetSecretList"
      itemsKey="secrets"
      setRefetch={setRefetch}
    />
  )
}
