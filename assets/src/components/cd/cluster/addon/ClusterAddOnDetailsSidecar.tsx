import { RuntimeServiceFragment } from 'generated/graphql'

import {
  BlockedIcon,
  CheckRoundedIcon,
  Sidecar,
  SidecarItem,
  Spinner,
} from '@pluralsh/design-system'
import { toNiceVersion } from 'utils/semver'
import { TabularNumbers } from 'components/cluster/TableElements'
import { useTheme } from 'styled-components'

export default function ServiceDetailsSidecar({
  runtimeService,
  kubeVersion,
}: {
  runtimeService?: RuntimeServiceFragment | null | undefined
  kubeVersion?: string | null | undefined
}) {
  const theme = useTheme()

  if (!runtimeService) {
    return null
  }
  const { name, addonVersion } = runtimeService

  return (
    <Sidecar>
      {name && <SidecarItem heading="Add-on name"> {name}</SidecarItem>}
      <SidecarItem heading="Add-on version">
        <TabularNumbers
          css={{
            ...theme.partials.text.body2,
          }}
        >
          {toNiceVersion(addonVersion?.version)}
        </TabularNumbers>
        <br />
      </SidecarItem>
      {kubeVersion && (
        <SidecarItem heading="Kubernetes version">
          <TabularNumbers>{toNiceVersion(kubeVersion)}</TabularNumbers>
        </SidecarItem>
      )}
      <SidecarItem heading="Blocks k8s upgrade">
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xsmall,
            minHeight: theme.partials.text.body2.lineHeight,
          }}
        >
          {typeof addonVersion?.blocking !== 'boolean' ? (
            <Spinner />
          ) : addonVersion?.blocking ? (
            <>
              <BlockedIcon color={theme.colors['icon-danger']} /> Blocking
            </>
          ) : (
            <>
              <CheckRoundedIcon color={theme.colors['icon-success']} /> Not
              blocking
            </>
          )}
        </div>
      </SidecarItem>
    </Sidecar>
  )
}
