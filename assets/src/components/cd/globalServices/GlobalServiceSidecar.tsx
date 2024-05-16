import {
  AppIcon,
  GlobeIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { getDistroProviderIconUrl } from 'components/utils/ClusterDistro'
import { Body2P } from 'components/utils/typography/Text'
import { GetServiceDataQuery } from 'generated/graphql'
import moment from 'moment'
import { useTheme } from 'styled-components'

function GlobalServiceSidecar({
  globalService,
}: {
  globalService: GetServiceDataQuery['globalService']
}) {
  const theme = useTheme()

  return (
    <Sidecar
      width={200}
      minWidth={200}
    >
      <SidecarItem heading="Last Updated">
        {moment(globalService?.updatedAt || globalService?.insertedAt).format(
          'M/D/YYYY'
        )}
      </SidecarItem>
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
            icon={globalService?.distro ? undefined : <GlobeIcon size={16} />}
            url={
              globalService?.distro
                ? getDistroProviderIconUrl({
                    distro: globalService?.distro,
                    provider: globalService?.provider?.cloud,
                    mode: theme.mode,
                  })
                : undefined
            }
          />
          {globalService?.distro || 'All distribution'}
        </div>
      </SidecarItem>
      {globalService?.tags?.length ? (
        <SidecarItem heading="Tags">
          <Body2P>
            {globalService?.tags
              ?.map((tag) => `${tag?.name}: ${tag?.value}`)
              .join(', ')}
          </Body2P>
        </SidecarItem>
      ) : null}
      <SidecarItem heading="ID">{globalService?.id}</SidecarItem>
      {globalService?.cascade?.delete ? (
        <SidecarItem heading="Cascade (Delete)">
          {globalService?.cascade?.delete}
        </SidecarItem>
      ) : null}
      {globalService?.cascade?.detach ? (
        <SidecarItem heading="Cascade (Detach)">
          {globalService?.cascade?.detach}
        </SidecarItem>
      ) : null}
      {globalService?.reparent ? (
        <SidecarItem heading="Reparent">{globalService?.reparent}</SidecarItem>
      ) : null}
    </Sidecar>
  )
}

export default GlobalServiceSidecar
