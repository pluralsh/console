import {
  ArrowTopRightIcon,
  Breadcrumb,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { WEBHOOKS_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'
import { CreateWebhookButton, WebhooksList } from './WebhooksList'

const WEBHOOKS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'webhooks', url: WEBHOOKS_SETTINGS_ABS_PATH },
]

export default function WebhooksSettings() {
  useSetBreadcrumbs(WEBHOOKS_SETTINGS_BREADCRUMBS)

  return (
    <>
      <SettingsDescription>
        Manage all your webhook integrations and settings here. Utilize them
        within workbenches to set up chatbots.
      </SettingsDescription>
      <PageToolbarPortal>
        <CreateWebhookButton
          buttonProps={{
            secondary: true,
            small: true,
            endIcon: <ArrowTopRightIcon />,
          }}
        />
      </PageToolbarPortal>
      <WebhooksList />
    </>
  )
}
