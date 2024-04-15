import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'

import { Link } from 'react-router-dom'

import {
  V1_LocalObjectReference as LocalObjectReferenceT,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'

const columnHelper = createColumnHelper<SecretReference>()

interface SecretReference {
  clusterId: string
  name: string
  namespace: string
}

interface ImagePullSecretsProps {
  imagePullSecrets: Nullable<Array<SecretReference>>
  maxHeight?: string
}

const columns = [
  // Name
  columnHelper.accessor((ref) => ref, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => {
      const { clusterId, name, namespace } = getValue()

      return (
        <Link
          to={getResourceDetailsAbsPath(clusterId, 'secret', name, namespace)}
        >
          <InlineLink>{name}</InlineLink>
        </Link>
      )
    },
  }),
]

export default function ImagePullSecrets({
  imagePullSecrets,
  maxHeight,
}: ImagePullSecretsProps): ReactElement {
  return (
    <Table
      data={imagePullSecrets ?? []}
      columns={columns}
      css={{
        height: '100%',
        ...(maxHeight ? { maxHeight } : {}),
      }}
      emptyStateProps={{
        message: 'No Image Pull Secrets found.',
      }}
    />
  )
}
