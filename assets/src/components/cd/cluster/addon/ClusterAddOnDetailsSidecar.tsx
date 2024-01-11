import { RuntimeServiceFragment } from 'generated/graphql'

import { Prop, PropsContainer } from '@pluralsh/design-system'
import { toNiceVersion } from 'utils/semver'

export default function ServiceDetailsSidecar({
  runtimeService,
}: {
  runtimeService?: RuntimeServiceFragment | null | undefined
}) {
  if (!runtimeService) {
    return null
  }
  const { name, addonVersion } = runtimeService

  return (
    <PropsContainer>
      {name && <Prop title="Add-on name"> {name}</Prop>}
      <Prop title="Blocking">{addonVersion?.blocking}</Prop>
      <Prop title="Add-on version">
        {toNiceVersion(addonVersion?.version)}
        <br />
      </Prop>
    </PropsContainer>
  )
}
