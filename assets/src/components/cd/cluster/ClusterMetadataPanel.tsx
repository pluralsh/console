import { ReactElement, useState } from 'react'
import {
  Button,
  ErrorIcon,
  IconFrame,
  InfoPanel,
  Prop,
  Tooltip,
  WarningIcon,
} from '@pluralsh/design-system'
import moment from 'moment'

import { useTheme } from 'styled-components'

import isEmpty from 'lodash/isEmpty'

import { ClusterFragment } from '../../../generated/graphql'
import CopyButton from '../../utils/CopyButton'
import ProviderIcon from '../../utils/Provider'
import ClusterUpgrade from '../clusters/ClusterUpgrade'
import { nextSupportedVersion } from '../../../utils/semver'

export default function ClusterMetadataPanel({
  cluster,
}: {
  cluster?: ClusterFragment | null
}): ReactElement | null {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
  const upgrade = nextSupportedVersion(
    cluster?.version,
    cluster?.provider?.supportedVersions
  )

  return (
    <>
      <Button
        secondary
        endIcon={
          hasDeprecations ? (
            <ErrorIcon
              color="icon-danger"
              width={16}
            />
          ) : upgrade ? (
            <WarningIcon
              color="icon-warning"
              width={16}
            />
          ) : null
        }
        onClick={() => setOpen(true)}
      >
        Metadata
      </Button>
      {open && (
        <InfoPanel
          title="Metadata"
          width={400}
          marginTop="155px"
          contentHeight={320}
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
            {upgrade || hasDeprecations ? (
              <ClusterUpgrade cluster={cluster} />
            ) : (
              '-'
            )}
          </Prop>
          <Prop
            title="Current K8s version"
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
      )}
    </>
  )
}
