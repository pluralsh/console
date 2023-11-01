import {
  Card,
  CheckRoundedIcon,
  IconFrame,
  Prop,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import moment from 'moment/moment'
import isEmpty from 'lodash/isEmpty'
import { createColumnHelper } from '@tanstack/react-table'

import { ClusterFragment, NodePool } from '../../../generated/graphql'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import ProviderIcon from '../../utils/Provider'
import CopyButton from '../../utils/CopyButton'
import ClusterUpgrade from '../clusters/ClusterUpgrade'
import { nextSupportedVersion, toNiceVersion } from '../../../utils/semver'

import {
  ClusterConditions,
  ClusterConditionsTable,
} from '../clusters/ClusterConditions'

import { useClusterContext } from './Cluster'

function MetadataCard({
  cluster,
  refetch,
}: {
  cluster: ClusterFragment
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const upgradeVersion = nextSupportedVersion(
    cluster?.version,
    cluster?.provider?.supportedVersions
  )
  const status = cluster?.status

  return (
    <Card padding="xlarge">
      <SubTitle>Metadata</SubTitle>
      <div css={{ display: 'flex', gap: theme.spacing.xlarge }}>
        <Prop
          title="Cluster name"
          margin={0}
        >
          {cluster?.name}
        </Prop>
        <Prop
          title="Current K8s version"
          margin={0}
        >
          {toNiceVersion(cluster?.currentVersion)}
        </Prop>
        <Prop
          title="Cloud"
          margin={0}
        >
          <IconFrame
            type="secondary"
            icon={
              <ProviderIcon
                provider={cluster?.provider?.cloud || 'BYOK'}
                width={16}
              />
            }
          />
        </Prop>
        <Prop
          title="Git URL"
          margin={0}
        >
          <CopyButton
            text={cluster?.service?.repository?.url || ''}
            type="secondary"
          />
        </Prop>
        <Prop
          title="Warnings"
          margin={0}
        >
          {upgradeVersion || hasDeprecations ? (
            <ClusterUpgrade
              cluster={cluster}
              refetch={refetch}
            />
          ) : (
            '-'
          )}
        </Prop>
        <Prop
          title="Conditions"
          margin={0}
        >
          {!isEmpty(cluster.status?.conditions) ? (
            <ClusterConditions cluster={cluster} />
          ) : (
            '-'
          )}
        </Prop>
        <Prop
          title="Last pinged"
          margin={0}
        >
          {cluster?.pingedAt ? (
            <Tooltip
              label={moment(cluster?.pingedAt).format('lll')}
              placement="top"
            >
              <span>{moment(cluster?.pingedAt).fromNow()}</span>
            </Tooltip>
          ) : (
            '-'
          )}
        </Prop>

        {/* TODO: Make these nice */}
        <Prop
          title="(temp)status: controlPlaneReady"
          margin={0}
        >
          {status?.controlPlaneReady}
        </Prop>
        <Prop
          title="(temp)status: phase"
          margin={0}
        >
          {status?.phase}
        </Prop>
        <Prop
          title="(temp)status: failureReason"
          margin={0}
        >
          {status?.failureReason}
        </Prop>
        <Prop
          title="(temp)status: failureMessage"
          margin={0}
        >
          {status?.failureMessage}
        </Prop>
      </div>
    </Card>
  )
}

function NodePoolsSection({ cluster }: { cluster: ClusterFragment }) {
  if (cluster.self || isEmpty(cluster.nodePools)) {
    return null
  }

  return (
    <Table
      data={cluster.nodePools || []}
      columns={columns}
      css={{
        maxHeight: 'unset',
        height: '100%',
      }}
    />
  )
}

const columnHelper = createColumnHelper<NodePool>()

export const columns = [
  columnHelper.accessor((nodePool) => nodePool?.name, {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.minSize, {
    id: 'minSize',
    header: 'Minimum size',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.maxSize, {
    id: 'maxSize',
    header: 'Maximum size',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.instanceType, {
    id: 'instanceType',
    header: 'Instance type',
    enableSorting: true,
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((nodePool) => nodePool?.spot, {
    id: 'spot',
    header: 'Spot',
    cell: ({ getValue }) =>
      getValue() && (
        <IconFrame
          icon={<CheckRoundedIcon color="icon-success" />}
          type="floating"
        />
      ),
  }),
]

export default function ClusterMetadata() {
  const theme = useTheme()
  const { cluster, refetch } = useClusterContext()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xlarge,
      }}
    >
      <MetadataCard
        cluster={cluster}
        refetch={refetch}
      />
      <NodePoolsSection cluster={cluster} />
    </div>
  )
}
