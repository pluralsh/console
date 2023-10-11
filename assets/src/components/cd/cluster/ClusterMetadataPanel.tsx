import { Dispatch, ReactElement } from 'react'
import { IconFrame, InfoPanel, Prop, Tooltip } from '@pluralsh/design-system'
import moment from 'moment'

import { useTheme } from 'styled-components'

import { ClustersRowFragment } from '../../../generated/graphql'
import CopyButton from '../../utils/CopyButton'
import ProviderIcon from '../../utils/ProviderIcon'

export default function ClusterMetadataPanel({
  cluster,
  open,
  setOpen,
}: {
  cluster?: ClustersRowFragment | null
  open: boolean
  setOpen: Dispatch<boolean>
}): ReactElement | null {
  const theme = useTheme()

  if (!open) return null

  return (
    <InfoPanel
      title="Metadata"
      width={388}
      marginTop="155px"
      contentHeight={442}
      contentPadding={16}
      contentGap={16}
      onClose={() => setOpen(false)}
    >
      <Prop
        title="Cluster name"
        margin={0}
      >
        {cluster?.name}
      </Prop>
      <Prop
        title="Warnings"
        margin={0}
      >
        TODO
      </Prop>
      <Prop
        title="K8s version"
        margin={0}
      >
        v{cluster?.currentVersion}
      </Prop>
      <div css={{ display: 'flex', gap: theme.spacing.large }}>
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
      </div>
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
    </InfoPanel>
  )
}
