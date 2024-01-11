import { RuntimeServiceFragment } from 'generated/graphql'

import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { toNiceVersion } from 'utils/semver'
import { TabularNumbers } from 'components/cluster/TableElements'
import { useTheme } from 'styled-components'

export default function ServiceDetailsSidecar({
  runtimeService,
}: {
  runtimeService?: RuntimeServiceFragment | null | undefined
}) {
  const theme = useTheme()

  if (!runtimeService) {
    return null
  }
  const { name, addonVersion } = runtimeService

  return (
    <Sidecar>
      {name && <SidecarItem heading="Add-on name"> {name}</SidecarItem>}
      <SidecarItem heading="Blocking">
        {addonVersion?.blocking ? 'Yes' : 'No'}
      </SidecarItem>
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
    </Sidecar>
  )
}
