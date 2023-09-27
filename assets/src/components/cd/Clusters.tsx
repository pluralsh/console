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

const ColWithIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

export function ColWithIcon({
  icon,
  children,
  ...props
}: ComponentProps<typeof ColWithIconSC>) {
  return (
    <ColWithIconSC {...props}>
      <div className="icon">
        <AppIcon
          size="xxsmall"
          icon={icon}
        />
        <div className="content">{children}</div>
      </div>
    </ColWithIconSC>
  )
}

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()
const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => <div css={{}}>{getValue()}</div>,
    meta: { truncate: true },
  }),
  columnHelper.accessor(({ node }) => node?.provider?.name, {
    id: 'cloud',
    header: 'Cloud',
    cell: ({
      getValue,
      // row: {
      //   original: { node },
      // },
    }) => <ColWithIcon icon={<ClusterIcon />}>{getValue()}</ColWithIcon>,
    meta: { truncate: true },
  }),
]

export default function Clusters() {
  const { data } = useClustersQuery()

  console.log('data', data)

  return (
    <div>
      {!isEmpty ? (
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
