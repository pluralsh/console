import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Maybe,
  V1_Subject as SubjectT,
} from '../../../generated/graphql-kubernetes'

import { Kind } from './types'
import ResourceLink from './ResourceLink'

const columnHelper = createColumnHelper<SubjectT>()

const columns = [
  columnHelper.accessor((subject) => subject?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((subject) => subject?.namespace, {
    id: 'namespace',
    header: 'Namespace',
    cell: ({ getValue }) => {
      const namespace = getValue()

      return (
        <ResourceLink
          objectRef={{
            kind: Kind.Namespace,
            name: namespace,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }),
  columnHelper.accessor((subject) => subject?.kind, {
    id: 'kind',
    header: 'Kind',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((subject) => subject?.apiGroup, {
    id: 'apiGroup',
    header: 'API group',
    cell: ({ getValue }) => getValue(),
  }),
]

export default function Subjects({
  subjects,
}: {
  subjects?: Maybe<Array<Maybe<SubjectT>>>
}): ReactElement<any> {
  return (
    <Table
      fullHeightWrap
      data={subjects || []}
      columns={columns}
    />
  )
}
