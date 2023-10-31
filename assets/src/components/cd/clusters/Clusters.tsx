import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Breadcrumb,
  CaretRightIcon,
  CheckRoundedIcon,
  CheckedShieldIcon,
  ClusterIcon,
  EmptyState,
  GearTrainIcon,
  IconFrame,
  Spinner,
  Table,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ClustersRowFragment, useClustersQuery } from 'generated/graphql'
import { ComponentProps, useMemo } from 'react'
import { isEmpty } from 'lodash'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { createColumnHelper } from '@tanstack/react-table'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  ColWithIcon,
  ColWithOptionalIcon,
} from 'components/utils/table/ColWithIcon'
import { getProviderIconURL, getProviderName } from 'components/utils/Provider'
import { Edge } from 'utils/graphql'
import {
  CD_BASE_PATH,
  CLUSTERS_PATH,
  GLOBAL_SETTINGS_PATH,
} from 'routes/cdRoutesConsts'
import { roundToTwoPlaces } from 'components/cluster/utils'
import { BasicLink } from 'components/utils/typography/BasicLink'

import { useSetCDHeaderContent } from '../ContinuousDeployment'
import {
  cpuFormat,
  cpuParser,
  memoryFormat,
  memoryParser,
} from '../../../utils/kubernetes'
import { UsageBar } from '../../cluster/nodes/UsageBar'
import { TableText } from '../../cluster/TableElements'
import { nextSupportedVersion } from '../../../utils/semver'

import DecoratedName from '../services/DecoratedName'

import { DeleteCluster } from '../providers/DeleteCluster'

import ClusterUpgrade from './ClusterUpgrade'
import { ClusterHealth } from './ClusterHealthChip'
import CreateCluster from './create/CreateCluster'
import { ClusterConditions } from './ClusterConditions'

export const CD_CLUSTERS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'cd', url: '/cd' },
  { label: 'clusters', url: `${CD_BASE_PATH}/${CLUSTERS_PATH}` },
]

const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

export function StackedText({ first, second }) {
  const theme = useTheme()

  return (
    <>
      <div>{first}</div>
      {second && (
        <div
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-xlight'],
          }}
        >
          {second}
        </div>
      )}
    </>
  )
}

export const columns = [
  columnHelper.accessor(({ node }) => node, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => {
      const cluster = getValue()

      return (
        <div css={{ display: 'flex' }}>
          <ColWithIcon icon={<ClusterIcon width={16} />}>
            <DecoratedName deletedAt={cluster?.deletedAt}>
              <div>
                <StackedText
                  first={
                    <BasicLink
                      as={Link}
                      to={`/cd/clusters/${cluster?.id}`}
                      css={{ whiteSpace: 'nowrap' }}
                    >
                      {cluster?.name}
                    </BasicLink>
                  }
                  second={`handle: ${cluster?.handle}`}
                />
              </div>
            </DecoratedName>
          </ColWithIcon>
          {cluster?.protect && (
            <Tooltip
              placement="top"
              label="This cluster is protected from deletion"
            >
              <CheckedShieldIcon
                margin={8}
                size={12}
              />
            </Tooltip>
          )}
        </div>
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
          icon={getProviderIconURL(
            provider?.cloud ?? '',
            theme.mode === 'dark'
          )}
        >
          {getProviderName(provider?.cloud)}
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'health',
    header: 'Health',
    cell: ({ getValue }) => <ClusterHealth cluster={getValue() || undefined} />,
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
      const different =
        !node?.self &&
        node?.currentVersion &&
        node?.version &&
        node?.currentVersion !== node?.version

      return (
        <ColWithOptionalIcon
          icon={
            different ? (
              <Spinner
                color={theme.colors['icon-info']}
                size={16}
              />
            ) : undefined
          }
        >
          <div>
            {node?.currentVersion && (
              <StackedText
                first={`Current: v${node?.currentVersion}`}
                second={node?.self ? null : `Target: v${node?.version}`}
              />
            )}
            {!node?.currentVersion && <>-</>}
          </div>
        </ColWithOptionalIcon>
      )
    },
  }),
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
      const display = `${usage ? cpuFormat(roundToTwoPlaces(usage)) : '—'} / ${
        capacity ? cpuFormat(capacity) : '—'
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

      const display = `${usage ? memoryFormat(usage) : '—'} / ${
        capacity ? memoryFormat(capacity) : '—'
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
      const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
      const upgrade = nextSupportedVersion(
        cluster?.version,
        cluster?.provider?.supportedVersions
      )

      return (
        (!!upgrade || hasDeprecations) &&
        !cluster?.self && <ClusterUpgrade cluster={cluster} />
      )
    },
  }),
  columnHelper.accessor(({ node }) => node?.status?.conditions?.length ?? 0, {
    id: 'conditions',
    header: 'Conditions',
    cell: ({ row: { original } }) => (
      <ClusterConditions cluster={original.node} />
    ),
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    cell: ({ table, getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const navigate = useNavigate()
      const cluster = getValue()
      const { refetch } = table.options.meta as { refetch?: () => void }

      return (
        <div css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}>
          {cluster && (
            <DeleteCluster
              cluster={cluster}
              refetch={refetch}
            />
          )}
          <IconFrame
            clickable
            onClick={() =>
              navigate(`/${CD_BASE_PATH}/${CLUSTERS_PATH}/${cluster?.id}`)
            }
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
  const theme = useTheme()
  const navigate = useNavigate()
  const { data, refetch } = useClustersQuery({
    pollInterval: 10 * 1000,
    fetchPolicy: 'cache-and-network',
  })
  const headerActions = useMemo(
    () => (
      <div
        css={{
          display: 'flex',
          justifyContent: 'end',
          gap: theme.spacing.large,
        }}
      >
        <IconFrame
          type="secondary"
          size="large"
          tooltip="Global settings"
          clickable
          icon={<GearTrainIcon />}
          onClick={() => navigate(GLOBAL_SETTINGS_PATH)}
        />
        <CreateCluster />
      </div>
    ),
    [navigate, theme.spacing.large]
  )

  useSetCDHeaderContent(headerActions)
  useSetBreadcrumbs(CD_CLUSTERS_BASE_CRUMBS)

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  if (!data) {
    return <LoadingIndicator />
  }

  return !isEmpty(data?.clusters?.edges) ? (
    <FullHeightTableWrap>
      <Table
        loose
        data={data?.clusters?.edges || []}
        columns={columns}
        reactTableOptions={reactTableOptions}
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
