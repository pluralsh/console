import {
  ArrowTopRightIcon,
  Breadcrumb,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { CLOUD_CONNECTIONS_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'
import {
  AddCloudConnectionButton,
  CloudConnectionsList,
} from './CloudConnectionsList'

const CLOUD_CONNECTIONS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'cloud connections', url: CLOUD_CONNECTIONS_SETTINGS_ABS_PATH },
]

export default function CloudConnectionsSettings() {
  useSetBreadcrumbs(CLOUD_CONNECTIONS_SETTINGS_BREADCRUMBS)

  return (
    <>
      <SettingsDescription>
        Manage all your configured cloud integrations in one place.
      </SettingsDescription>
      <PageToolbarPortal>
        <AddCloudConnectionButton
          buttonProps={{
            secondary: true,
            small: true,
            endIcon: <ArrowTopRightIcon />,
          }}
        />
      </PageToolbarPortal>
      <CloudConnectionsList />
    </>
  )
}
