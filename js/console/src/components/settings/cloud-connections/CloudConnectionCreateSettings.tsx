import {
  Button,
  Breadcrumb,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { CloudConnectionCreateForm } from 'components/workbenches/tools/cloud-connection/CloudConnectionCreateForm'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { Provider } from 'generated/graphql'
import { useEffect, useEffectEvent, useState } from 'react'
import {
  CLOUD_CONNECTIONS_SETTINGS_ABS_PATH,
  CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useNavigate } from 'react-router-dom'
import {
  getCloudConnectionSetupGuideDocumentationUrl,
  getCloudConnectionSetupGuideMarkdownPath,
} from '../../workbenches/tools/cloud-connection/cloudConnectionSetupGuides'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'

const CLOUD_CONNECTIONS_CREATE_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'cloud connections', url: CLOUD_CONNECTIONS_SETTINGS_ABS_PATH },
  {
    label: 'create cloud connection',
    url: CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH,
  },
]

export function CloudConnectionCreateSettings() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState(Provider.Aws)
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const markdownPath = getCloudConnectionSetupGuideMarkdownPath(provider)
  const documentationUrl =
    getCloudConnectionSetupGuideDocumentationUrl(provider)

  useSetBreadcrumbs(CLOUD_CONNECTIONS_CREATE_BREADCRUMBS)

  const openGuide = useEffectEvent(() =>
    openSetupGuidePanel({
      documentationUrl,
      markdownPath,
    })
  )
  useEffect(() => openGuide(), [provider])

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  return (
    <>
      <SettingsDescription>
        Create a cloud connection that workbenches can use to query your
        infrastructure.
      </SettingsDescription>
      {!isOpen && (
        <PageToolbarPortal>
          <Button
            secondary
            small
            startIcon={<SidePanelOpenIcon />}
            onClick={() =>
              openSetupGuidePanel({
                documentationUrl,
                markdownPath,
              })
            }
          >
            Setup guide
          </Button>
        </PageToolbarPortal>
      )}
      <CloudConnectionCreateForm
        backPath={CLOUD_CONNECTIONS_SETTINGS_ABS_PATH}
        onSaved={() => navigate(CLOUD_CONNECTIONS_SETTINGS_ABS_PATH)}
        selectableProvider
        onProviderChange={setProvider}
        showSetupGuideButton={false}
      />
    </>
  )
}
