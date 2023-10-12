import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  CaretRightIcon,
  CheckRoundedIcon,
  ClusterIcon,
  EmptyState,
  IconFrame,
  Table,
  Tooltip,
  useSetBreadcrumbs,
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
import { providerName, providerToURL } from 'components/utils/Provider'
import { Edge } from 'utils/graphql'
import { CD_BASE_PATH, CLUSTERS_PATH } from 'routes/cdRoutesConsts'

import { CD_BASE_CRUMBS, useSetCDHeaderContent } from '../ContinuousDeployment'
import {
  cpuFormat,
  cpuParser,
  memoryFormat,
  memoryParser,
} from '../../../utils/kubernetes'
import { UsageBar } from '../../cluster/nodes/UsageBar'
import { TableText } from '../../cluster/TableElements'

import ClusterCreate from './ClusterCreate'
import ClusterUpgrade from './ClusterUpgrade'
import ClusterHealthChip from './ClusterHealthChip'

const POLL_INTERVAL = 10 * 1000

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
          {providerName(provider?.name)}
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
  columnHelper.accessor(({ node }) => node, {
    id: 'cpu',
    header: 'CPU',
    cell: ({ getValue }) => {
      const cluster = getValue()
      const usage = cluster?.nodeMetrics?.reduce(
        (acc, current) => acc + (cpuParser(current?.usage?.cpu) ?? 0),
        0
      )
      const capacity = cluster?.nodes?.reduce(
        (acc, current) =>
          // @ts-ignore
          acc + (cpuParser(current?.status?.capacity?.cpu) ?? 0),
        0
      )
      const display = `${usage ? cpuFormat(usage) : '-'} / ${
        capacity ? cpuFormat(capacity) : '-'
      }`

      return usage !== undefined && !!capacity ? (
        <Tooltip
          label={display}
          placement="top"
        >
          <TableText>
            <UsageBar
              usage={usage / capacity}
              width={120}
            />
          </TableText>
        </Tooltip>
      ) : (
        display
      )
    },
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'memory',
    header: 'Memory',
    cell: ({ getValue }) => {
      const cluster = getValue()
      const usage = cluster?.nodeMetrics?.reduce(
        (acc, current) => acc + (memoryParser(current?.usage?.memory) ?? 0),
        0
      )
      const capacity = cluster?.nodes?.reduce(
        (acc, current) =>
          // @ts-ignore
          acc + (memoryParser(current?.status?.capacity?.memory) ?? 0),
        0
      )

      const display = `${usage ? memoryFormat(usage) : '-'} / ${
        capacity ? memoryFormat(capacity) : '-'
      }`

      return usage !== undefined && !!capacity ? (
        <Tooltip
          label={display}
          placement="top"
        >
          <TableText>
            <UsageBar
              usage={usage / capacity}
              width={120}
            />
          </TableText>
        </Tooltip>
      ) : (
        display
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.self, {
    id: 'mgmt',
    header: 'Mgmt',
    cell: ({ getValue }) =>
      getValue() && (
        <IconFrame
          icon={<CheckRoundedIcon color="icon-success" />}
          type="floating"
        />
      ),
  }),
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

export const CLUSTERS_CRUMBS = [
  ...CD_BASE_CRUMBS,
  { label: 'clusters', url: `/${CD_BASE_PATH}/${CLUSTERS_PATH}` },
]

export default function Clusters() {
  const { data } = useClustersQuery({ pollInterval: POLL_INTERVAL })
  const headerActions = useMemo(() => <ClusterCreate />, [])

  useSetCDHeaderContent(headerActions)
  useSetBreadcrumbs(CLUSTERS_CRUMBS)

  if (!data) {
    return <LoadingIndicator />
  }

  return !isEmpty(data?.clusters?.edges) ? (
    <FullHeightTableWrap>
      <Table
        loose
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
