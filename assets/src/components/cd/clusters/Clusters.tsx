import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  CaretRightIcon,
  ClusterIcon,
  EmptyState,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { ClustersRowFragment, useClustersQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { isEmpty } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { createColumnHelper } from '@tanstack/react-table'
import { A } from 'honorable'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { providerToURL } from 'components/utils/ProviderIcon'
import { Edge } from 'utils/graphql'

import { useSetCDHeaderContent } from '../ContinuousDeployment'

import CreateCluster from './create/CreateCluster'
import ClusterUpgrade from './ClusterUpgrade'
import ClusterHealthChip from './ClusterHealthChip'

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => {
      const cluster = getValue()

      return (
        <ColWithIcon icon={<ClusterIcon width={16} />}>
          <A
            as={Link}
            to={`/cd/clusters/${cluster?.id}`}
            whiteSpace="nowrap"
          >
            {cluster?.name}
          </A>
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.provider, {
    id: 'cloud',
    header: 'Cloud',
    cell: ({ getValue }) => {
      const provider = getValue()
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <ColWithIcon
          icon={providerToURL(provider?.cloud ?? '', theme.mode === 'dark')}
        >
          {provider?.name ?? 'BYOK'}
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
            Target: v{node?.version}
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
  // TODO: Add both once resource data is available.
  // columnHelper.accessor(({ node }) => node?.nodePools, {
  //   id: 'cpu',
  //   header: 'CPU',
  //   cell: () => <div>TODO</div>,
  // }),
  // columnHelper.accessor(({ node }) => node?.nodePools, {
  //   id: 'memory',
  //   header: 'Memory',
  //   cell: () => <div>TODO</div>,
  // }),
  columnHelper.accessor(({ node }) => node, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const cluster = getValue()
      const hasUpgrade = true // TODO

      return hasUpgrade && <ClusterUpgrade cluster={cluster} />
    },
  }),
  columnHelper.accessor(({ node }) => node?.pingedAt, {
    id: 'health',
    header: 'Health',
    cell: ({ getValue }) => <ClusterHealthChip pingedAt={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const navigate = useNavigate()
      const cluster = getValue()

      return (
        <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
          <IconFrame
            clickable
            onClick={() => navigate(`/cd/clusters/${cluster?.id}`)}
            size="medium"
            icon={<CaretRightIcon />}
            textValue="Go to cluster details"
            tooltip
            type="tertiary"
          />
        </div>
      )
    },
  }),
]

export default function Clusters() {
  const { data } = useClustersQuery()
  const headerActions = useMemo(() => <CreateCluster />, [])

  useSetCDHeaderContent(headerActions)

  if (!data) {
    return <LoadingIndicator />
  }

  return !isEmpty(data?.clusters?.edges) ? (
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
  )
}
