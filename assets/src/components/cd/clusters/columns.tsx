import { createColumnHelper } from '@tanstack/react-table'
import { AppIcon, ClusterIcon } from '@pluralsh/design-system'
import { A } from 'honorable'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps } from 'react'

import ProviderIcon from '../../utils/ProviderIcon'
import { ClustersRowFragment } from '../../../generated/graphql'
import { Edge } from '../../../utils/graphql'

import Deprecations from './Deprecations'

const ColWithIconSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,

  '.content': {
    display: 'flex',
    flexDirection: 'column',
  },
}))

function ColWithIcon({
  icon,
  children,
  ...props
}: ComponentProps<typeof ColWithIconSC>) {
  return (
    <ColWithIconSC {...props}>
      <AppIcon
        size="xxsmall"
        icon={icon}
      />
      <div className="content">{children}</div>
    </ColWithIconSC>
  )
}

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
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name ?? '', {
    id: 'cloud',
    header: 'Cloud',
    cell: ({ getValue }) => (
      <ColWithIcon
        icon={
          <ProviderIcon
            provider={getValue()}
            width={16}
          />
        }
      >
        {getValue()}
      </ColWithIcon>
    ),
    meta: { truncate: true },
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
    meta: { truncate: true },
  }),
  // TODO: Add once VPC ID is available.
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'vpc',
  //   header: 'VPC ID',
  //   cell: () => 'TODO',
  //   meta: { truncate: true },
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
  //   meta: { truncate: true },
  // }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'cpu',
    header: 'CPU',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'memory',
    header: 'Memory',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
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
    meta: { truncate: true },
  }),
]
