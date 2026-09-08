import {
  Button,
  Breadcrumb,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { CloudConnectionCreateForm } from 'components/workbenches/tools/cloud-connection/CloudConnectionCreateForm'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { Provider } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  CLOUD_CONNECTIONS_SETTINGS_ABS_PATH,
  CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  getCloudConnectionSetupGuideDocumentationUrl,
  getCloudConnectionSetupGuideMarkdownPath,
} from '../../workbenches/tools/cloud-connection/cloudConnectionSetupGuides'
import { SETTINGS_BREADCRUMBS } from '../Settings'

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
  const theme = useTheme()
  const [provider, setProvider] = useState(Provider.Aws)
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const markdownPath = getCloudConnectionSetupGuideMarkdownPath(provider)
  const documentationUrl =
    getCloudConnectionSetupGuideDocumentationUrl(provider)

  useSetBreadcrumbs(CLOUD_CONNECTIONS_CREATE_BREADCRUMBS)
  useSetPageHeaderContent(
    useMemo(
      () => (
        <Flex justifyContent="space-between">
          <StackedTextSC>
            <span
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-light'],
              }}
            >
              Create a cloud connection that workbenches can use to query your
              infrastructure.
            </span>
          </StackedTextSC>
          {!isOpen && (
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              onClick={() =>
                openSetupGuidePanel({
                  documentationUrl,
                  markdownPath,
                })
              }
              css={{ whiteSpace: 'nowrap' }}
            >
              Setup guide
            </Button>
          )}
        </Flex>
      ),
      [documentationUrl, isOpen, markdownPath, openSetupGuidePanel, theme]
    )
  )

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
    <CloudConnectionCreateForm
      backPath={CLOUD_CONNECTIONS_SETTINGS_ABS_PATH}
      onSaved={() => navigate(CLOUD_CONNECTIONS_SETTINGS_ABS_PATH)}
      selectableProvider
      onProviderChange={setProvider}
      showSetupGuideButton={false}
    />
  )
}
