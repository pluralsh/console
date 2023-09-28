import { createColumnHelper } from '@tanstack/react-table'
import { ClusterIcon } from '@pluralsh/design-system'
import { A } from 'honorable'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { providerToURL } from '../../utils/ProviderIcon'
import { ClustersRowFragment } from '../../../generated/graphql'
import { Edge } from '../../../utils/graphql'

import { ColWithIcon } from '../repos/GitRepositories'

import Deprecations from './Deprecations'

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => (
      <ColWithIcon icon={<ClusterIcon width={16} />}>
        <A
          as={Link}
          to="/cd/clusters/" // TODO: Update once details view is available.
          whiteSpace="nowrap"
        >
          {getValue()}
        </A>
      </ColWithIcon>
    ),
    // meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name ?? '', {
    id: 'cloud',
    header: 'Cloud',
    cell: ({ getValue, row: { original } }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      console.log('getVal', getValue())
      console.log('or', original.node)

      return (
        <ColWithIcon icon={providerToURL(getValue(), theme.mode === 'dark')}>
          {getValue() || 'Unknown'}
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'version',
    header: 'Version',
    cell: ({
      row: {
        original: { node },
      },
    }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <div>
          <div>Current: v{node?.currentVersion}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            Desired: v{node?.version}
          </div>
        </div>
      )
    },
  }),
  // TODO: Add once VPC ID is available.
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'vpc',
  //   header: 'VPC ID',
  //   cell: () => 'TODO',
  // }),
  // TODO: Add once owner is available.
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'owner',
  //   header: 'Owner',
  //   cell: () => (
  //     <UserDetails
  //       name="TODO"
  //       avatar={null}
  //       email="todo@todo.todo"
  //     />
  //   ),
  // }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'cpu',
    header: 'CPU',
    cell: () => <div>TODO</div>,
  }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'memory',
    header: 'Memory',
    cell: () => <div>TODO</div>,
  }),
  columnHelper.accessor(({ node }) => node?.apiDeprecations, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const deprecations = getValue()

      return (
        <div>
          {isEmpty(deprecations) && ( // TODO: Flip logic.
            <Deprecations deprecations={deprecations} />
          )}
          TODO
        </div>
      )
    },
  }),
]
