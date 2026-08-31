import { createColumnHelper } from '@tanstack/react-table'
import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'

import { Kind } from './types'
import ResourceLink from './ResourceLink'

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
      const { name, namespace } = getValue()

      return (
        <ResourceLink
          short
          objectRef={{
            kind: Kind.Secret,
            namespace,
            name,
          }}
        />
      )
    },
  }),
]

export default function ImagePullSecrets({
  imagePullSecrets,
  maxHeight,
}: ImagePullSecretsProps): ReactElement<any> {
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
