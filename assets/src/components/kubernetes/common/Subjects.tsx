import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Link, useParams } from 'react-router-dom'

import {
  Maybe,
  V1_Subject as SubjectT,
} from '../../../generated/graphql-kubernetes'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'

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
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { clusterId } = useParams()

      const namespace = getValue()

      if (!namespace) return null

      return (
        <Link
          to={getResourceDetailsAbsPath(clusterId, 'namespace', getValue())}
          onClick={(e) => e.stopPropagation()}
        >
          <InlineLink>{namespace}</InlineLink>
        </Link>
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
}): ReactElement {
  return (
    <Table
      data={subjects || []}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
