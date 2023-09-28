import { createColumnHelper } from '@tanstack/react-table'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  AppIcon,
  ClusterIcon,
  EmptyState,
  Table,
} from '@pluralsh/design-system'
import { type ClustersRowFragment, useClustersQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'
import styled from 'styled-components'
import { ComponentProps } from 'react'
import { isEmpty } from 'lodash'
import { A } from 'honorable'
import { Link } from 'react-router-dom'

import ProviderIcon from '../utils/ProviderIcon'

export const CellCaption = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const ColWithIconSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,

  '.content': {
    display: 'flex',
    flexDirection: 'column',
  },
}))

export function ColWithIcon({
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
const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => (
      // TODO: Set ClusterIcon size.
      <ColWithIcon icon={<ClusterIcon width={16} />}>
        <A
          as={Link}
          to="/cd/clusters/" // TODO: Update once details view is ready.
          whiteSpace="nowrap"
        >
          {getValue()}
        </A>
      </ColWithIcon>
    ),
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name || 'aws', {
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
    }) => (
      <div>
        <div>Current: v{node?.currentVersion}</div>
        <CellCaption>Desired: v{node?.version}</CellCaption>
      </div>
    ),
    meta: { truncate: true },
  }),
  // TODO: Add once VPC ID will be available.
  // columnHelper.accessor(({ node }) => node?.version, {
  //   id: 'vpc',
  //   header: 'VPC ID',
  //   cell: () => 'TODO',
  //   meta: { truncate: true },
  // }),
  // TODO: Fill once owner data will be available.
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
  columnHelper.accessor(({ node }) => node?.version, {
    id: 'status',
    header: 'Status',
    cell: () => <div>TODO</div>,
    meta: { truncate: true },
  }),
]

export default function Clusters() {
  const { data } = useClustersQuery()

  console.log('data', data)

  return (
    <div>
      {!isEmpty(data?.clusters?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.clusters?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any CD clusters yet." />
      )}
    </div>
  )
}
