import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'

import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import {
  Secret_SecretList as SecretListT,
  Secret_Secret as SecretT,
  SecretsQuery,
  SecretsQueryVariables,
  useConfigMapsQuery,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<SecretT>()

export default function Secrets() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<SecretListT, SecretT, SecretsQuery, SecretsQueryVariables>
      namespaced
      columns={columns}
      query={useConfigMapsQuery}
      queryName="handleGetSecretList"
      itemsKey="secrets"
    />
  )
}
