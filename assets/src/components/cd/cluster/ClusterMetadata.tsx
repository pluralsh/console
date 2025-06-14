import {
  Card,
  ChipList,
  Code,
  Flex,
  IconFrame,
  SidecarItem,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'

import { ClusterFragment } from 'generated/graphql'
import { nextSupportedVersion, toNiceVersion } from 'utils/semver'

import { TooltipTime } from 'components/utils/TooltipTime'

import { getServiceDetailsPath } from '../../../routes/cdRoutesConsts'
import { ClusterProviderIcon } from '../../utils/Provider'
import { SubTitle } from '../../utils/SubTitle'
import { InlineLink } from '../../utils/typography/InlineLink'

import { useState } from 'react'
import { ClusterUpgradeButton } from '../clusters/ClusterUpgradeButton'
import {
  ClusterInfoFlyover,
  ClusterInfoFlyoverTab,
} from '../clusters/info-flyover/ClusterInfoFlyover'
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
  const [flyoverOpen, setFlyoverOpen] = useState(false)
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const upgradeVersion = nextSupportedVersion(
    cluster?.version,
    cluster?.provider?.supportedVersions
  )
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
              <>
                <ClusterUpgradeButton
                  cluster={cluster}
                  onClick={() => setFlyoverOpen(true)}
                />
                <ClusterInfoFlyover
                  cluster={flyoverOpen ? cluster : null}
                  open={flyoverOpen}
                  initialTab={ClusterInfoFlyoverTab.Upgrades}
                  onClose={() => setFlyoverOpen(false)}
                  refetch={refetch}
                />
              </>
            ) : (
              '-'
            )}
          </MetadataPropSC>
          <MetadataPropSC heading="Last pinged">
            {cluster?.pingedAt ? (
              <TooltipTime
                placement="top"
                date={cluster?.pingedAt}
              >
                <span>{fromNow(cluster?.pingedAt)}</span>
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

export default function ClusterMetadata() {
  const { cluster, refetch } = useClusterContext()

  return (
    <Flex
      direction="column"
      gap="xlarge"
      flex={1}
    >
      <MetadataCard
        cluster={cluster}
        refetch={refetch}
      />
      <NodePoolsSection cluster={cluster} />
    </Flex>
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
