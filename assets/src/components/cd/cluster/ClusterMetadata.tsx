import {
  Card,
  Chip,
  IconFrame,
  Prop,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import moment from 'moment/moment'
import isEmpty from 'lodash/isEmpty'

import { ClusterFragment, ClusterStatus } from 'generated/graphql'
import { nextSupportedVersion, toNiceVersion } from 'utils/semver'

import { SubTitle } from '../../cluster/nodes/SubTitle'
import ProviderIcon from '../../utils/Provider'
import CopyButton from '../../utils/CopyButton'
import ClusterUpgrade from '../clusters/ClusterUpgrade'
import { ClusterConditions } from '../clusters/ClusterConditions'

import { useClusterContext } from './Cluster'
import { NodePoolsSection } from './ClusterNodePools'

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
      <div
        css={{ display: 'flex', gap: theme.spacing.xlarge, flexWrap: 'wrap' }}
      >
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
        {/* TODO: Make these nice */}
        <Prop
          title="Control plane"
          margin={0}
        >
          <Chip severity={status?.controlPlaneReady ? 'success' : 'warning'}>
            {status?.controlPlaneReady ? 'Ready' : 'Not ready'}
          </Chip>
        </Prop>
        <Prop
          title="Status"
          margin={0}
        >
          <ClusterStatusChip status={status} />
        </Prop>
      </div>
    </Card>
  )
}

function ClusterStatusChip({
  status,
}: {
  status: Nullable<
    Pick<ClusterStatus, 'phase' | 'failureMessage' | 'failureReason'>
  >
}) {
  const theme = useTheme()
  const { failureMessage, failureReason, phase } = status || {}

  return (
    <WrapWithIf
      condition={!!failureMessage || !!failureReason}
      wrapper={
        <Tooltip
          label={
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.xxsmall,
                maxWidth: 300,
              }}
            >
              {failureReason && <p>Reason: {failureReason}</p>}
              {failureMessage && <p>{failureMessage}</p>}
            </div>
          }
        />
      }
    >
      <Chip
        severity={
          phase?.toLowerCase() === 'provisioned'
            ? 'success'
            : failureReason || failureMessage
            ? 'error'
            : 'neutral'
        }
      >
        {phase || 'Unknown'}
      </Chip>
    </WrapWithIf>
  )
}

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
