import {
  AppIcon,
  GlobeIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'
import { Body2P } from 'components/utils/typography/Text'
import { GetManagedNamespaceQuery } from 'generated/graphql'
import { formatDateTime } from 'utils/datetime'
import { useTheme } from 'styled-components'

function NamespaceSidecar({
  namespace,
}: {
  namespace: GetManagedNamespaceQuery['managedNamespace']
}) {
  const theme = useTheme()

  return (
    <Sidecar
      width={200}
      minWidth={200}
    >
      <SidecarItem heading="Last Updated">
        {formatDateTime(
          namespace?.updatedAt || namespace?.insertedAt,
          'M/D/YYYY'
        )}
      </SidecarItem>
      <SidecarItem heading="ID">{namespace?.id}</SidecarItem>
      {namespace?.description ? (
        <SidecarItem heading="Description">
          {namespace?.description}
        </SidecarItem>
      ) : null}
      <SidecarItem heading="Distribution">
        <div
          css={{
            ...theme.partials.text.body2,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.small,
          }}
        >
          <AppIcon
            spacing="padding"
            size="xxsmall"
            icon={
              namespace?.target?.distro ? undefined : <GlobeIcon size={16} />
            }
            url={
              namespace?.target?.distro
                ? getDistroProviderIconUrl({
                    distro: namespace?.target?.distro,
                    provider: null,
                    mode: theme.mode,
                  })
                : undefined
            }
          />
          {namespace?.target?.distro || 'All distribution'}
        </div>
      </SidecarItem>
      {namespace?.cascade?.delete ? (
        <SidecarItem heading="Cascade (Delete)">
          {namespace?.cascade?.delete}
        </SidecarItem>
      ) : null}
      {namespace?.cascade?.detach ? (
        <SidecarItem heading="Cascade (Detach)">
          {namespace?.cascade?.detach}
        </SidecarItem>
      ) : null}
      {namespace?.labels ? (
        <SidecarItem heading="Labels">
          <Body2P>
            {Object.keys(namespace?.labels || {})
              ?.map((label) => `${label}: ${namespace?.labels?.[label]}`)
              .join(', ')}
          </Body2P>
        </SidecarItem>
      ) : null}
    </Sidecar>
  )
}

export default NamespaceSidecar
