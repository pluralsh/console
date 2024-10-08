import {
  Card,
  Chip,
  ChipList,
  Code,
  IconFrame,
  SidecarItem,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import moment from 'moment/moment'
import isEmpty from 'lodash/isEmpty'
import { Link } from 'react-router-dom'

import { ClusterFragment, ClusterStatus } from 'generated/graphql'
import { nextSupportedVersion, toNiceVersion } from 'utils/semver'

import { TooltipTime } from 'components/utils/TooltipTime'

import { SubTitle } from '../../utils/SubTitle'
import ClusterUpgrade from '../clusters/ClusterUpgrade'
import { ClusterConditions } from '../clusters/ClusterConditions'
import { getServiceDetailsPath } from '../../../routes/cdRoutesConsts'
import { InlineLink } from '../../utils/typography/InlineLink'
import { ClusterProviderIcon } from '../../utils/Provider'

import { useClusterContext } from './Cluster'
import { NodePoolsSection } from './ClusterNodePools'

const MetadataPropSC = styled(SidecarItem)((_) => ({
  margin: 0,
}))

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
  const renderTag = (tag) => `${tag.name}${tag.value ? `: ${tag.value}` : ''}`

  return (
    <Card
      css={{
        '&&': {
          padding: theme.spacing.large,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        },
      }}
    >
      <section>
        <SubTitle>Metadata</SubTitle>
        <div
          css={{ display: 'flex', gap: theme.spacing.xlarge, flexWrap: 'wrap' }}
        >
          <MetadataPropSC heading="Cluster name">
            {cluster?.name}
          </MetadataPropSC>
          <MetadataPropSC heading="Current K8s version">
            {toNiceVersion(cluster?.currentVersion)}
          </MetadataPropSC>
          <MetadataPropSC heading="Cloud">
            <IconFrame
              type="secondary"
              icon={
                <ClusterProviderIcon
                  cluster={cluster}
                  size={16}
                />
              }
            />
          </MetadataPropSC>
          {!cluster?.self && (
            <MetadataPropSC heading="Service">
              <InlineLink
                as={Link}
                to={getServiceDetailsPath({
                  clusterId: cluster?.id,
                  serviceId: cluster?.service?.id,
                })}
              >
                {cluster?.service?.name}
              </InlineLink>
            </MetadataPropSC>
          )}
          <MetadataPropSC heading="Warnings">
            {upgradeVersion || hasDeprecations ? (
              <ClusterUpgrade
                cluster={cluster}
                refetch={refetch}
              />
            ) : (
              '-'
            )}
          </MetadataPropSC>
          {status && (
            <>
              <MetadataPropSC heading="Conditions">
                {!isEmpty(status?.conditions) ? (
                  <ClusterConditions cluster={cluster} />
                ) : (
                  '-'
                )}
              </MetadataPropSC>
              <MetadataPropSC heading="Control plane">
                <Chip
                  severity={status?.controlPlaneReady ? 'success' : 'warning'}
                >
                  {status?.controlPlaneReady ? 'Ready' : 'Not ready'}
                </Chip>
              </MetadataPropSC>
              <MetadataPropSC heading="Status">
                <ClusterStatusChip status={status} />
              </MetadataPropSC>
            </>
          )}
          <MetadataPropSC heading="Last pinged">
            {cluster?.pingedAt ? (
              <TooltipTime
                placement="top"
                date={cluster?.pingedAt}
              >
                <span>{moment(cluster?.pingedAt).fromNow()}</span>
              </TooltipTime>
            ) : (
              '-'
            )}
          </MetadataPropSC>
        </div>
      </section>
      {cluster?.tags && !isEmpty(cluster.tags) && (
        <section>
          <SubTitle>Tags</SubTitle>
          <ChipList
            size="small"
            limit={8}
            values={cluster.tags}
            transformValue={renderTag}
          />
        </section>
      )}
      {cluster.metadata && (
        <Code language="json">{formatJson(cluster.metadata)}</Code>
      )}
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
              ? 'danger'
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

function formatJson(jsonObject) {
  try {
    // Convert the object back into a formatted string
    return JSON.stringify(jsonObject, null, 2)
  } catch (e) {
    console.error('Invalid JSON:', e)

    return '' // Return empty string or error message if JSON is invalid
  }
}
