import { useOutletContext } from 'react-router-dom'
import { Card, IconFrame, Prop, Tooltip } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import moment from 'moment/moment'
import isEmpty from 'lodash/isEmpty'

import { Cluster } from '../../../generated/graphql'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import ProviderIcon from '../../utils/Provider'
import CopyButton from '../../utils/CopyButton'
import ClusterUpgrade from '../clusters/ClusterUpgrade'
import { nextSupportedVersion } from '../../../utils/semver'

function MetadataCard({ cluster }: { cluster: Cluster }) {
  const theme = useTheme()
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const upgradeVersion = nextSupportedVersion(
    cluster?.version,
    cluster?.provider?.supportedVersions
  )

  return (
    <Card padding="xlarge">
      <SubTitle>Containers</SubTitle>
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
          v{cluster?.currentVersion}
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
            <ClusterUpgrade cluster={cluster} />
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
      </div>
    </Card>
  )
}

export default function ClusterMetadata() {
  const theme = useTheme()
  const { cluster } = useOutletContext() as { cluster: Cluster }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <MetadataCard cluster={cluster} />
    </div>
  )
}
