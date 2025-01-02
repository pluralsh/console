import { ReactElement } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import {
  Maybe,
  V1_PolicyRule as PolicyRuleT,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<PolicyRuleT>()

const columns = [
  columnHelper.accessor((rule) => rule?.resources, {
    id: 'resources',
    header: 'Resources',
    cell: ({ getValue }) =>
      getValue()?.map((resource) => <div>{resource}</div>),
  }),
  columnHelper.accessor((rule) => rule?.nonResourceURLs, {
    id: 'nonResourceURLs',
    header: 'Non-resource URL',
    cell: ({ getValue }) =>
      getValue()?.map((nonResourceURL) => <div>{nonResourceURL}</div>),
  }),
  columnHelper.accessor((rule) => rule?.resourceNames, {
    id: 'resourceNames',
    header: 'Resource names',
    cell: ({ getValue }) =>
      getValue()?.map((resourceName) => <div>{resourceName}</div>),
  }),
  columnHelper.accessor((rule) => rule?.verbs, {
    id: 'verbs',
    header: 'Verbs',
    cell: ({ getValue }) => getValue()?.map((verb) => <div>{verb}</div>),
  }),
  columnHelper.accessor((rule) => rule?.apiGroups, {
    id: 'apiGroups',
    header: 'API groups',
    cell: ({ getValue }) =>
      getValue()?.map((apiGroup) => <div>{apiGroup}</div>),
  }),
]

export default function PolicyRules({
  rules,
}: {
  rules: Array<Maybe<PolicyRuleT>>
}): ReactElement<any> {
  return (
    <Table
      data={rules}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}
