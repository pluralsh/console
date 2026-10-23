import {
  Button,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import {
  getSetupGuideDocumentationUrl,
  getSetupGuideMarkdownPath,
} from 'components/settings/webhooks/webhookCreateFormSetupGuides'
import { WebhookCreateForm } from 'components/settings/webhooks/WebhookCreateForm'
import { SetupGuideSelection } from 'components/settings/webhooks/WebhookCreateFormTypes'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { useEffect, useEffectEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  WEBHOOKS_SETTINGS_ABS_PATH,
  WEBHOOKS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'

const WEBHOOKS_SETTINGS_CREATE_BREADCRUMBS = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'webhooks', url: WEBHOOKS_SETTINGS_ABS_PATH },
  { label: 'create webhook', url: WEBHOOKS_SETTINGS_CREATE_ABS_PATH },
]

export function WebhookCreateSettings() {
  const navigate = useNavigate()
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [setupGuideSelection, setSetupGuideSelection] =
    useState<SetupGuideSelection>({
      webhookType: 'observability',
      observabilityType: null,
      issueProvider: null,
    })
  const setupGuideMarkdownPath = getSetupGuideMarkdownPath(setupGuideSelection)
  const setupGuideDocumentationUrl =
    getSetupGuideDocumentationUrl(setupGuideSelection)

  useSetBreadcrumbs(WEBHOOKS_SETTINGS_CREATE_BREADCRUMBS)

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  useEffect(() => {
    if (!isOpen) return
    if (!setupGuideMarkdownPath) {
      closeSetupGuidePanel()
      return
    }

    openSetupGuidePanel({
      documentationUrl: setupGuideDocumentationUrl,
      markdownPath: setupGuideMarkdownPath,
    })
  }, [
    isOpen,
    setupGuideMarkdownPath,
    setupGuideDocumentationUrl,
    openSetupGuidePanel,
    closeSetupGuidePanel,
  ])

  return (
    <>
      <SettingsDescription>
        Create a webhook integration for observability or ticketing events.
      </SettingsDescription>
      {!isOpen && !!setupGuideMarkdownPath && (
        <PageToolbarPortal>
          <Button
            secondary
            small
            startIcon={<SidePanelOpenIcon />}
            onClick={() =>
              openSetupGuidePanel({
                documentationUrl: setupGuideDocumentationUrl,
                markdownPath: setupGuideMarkdownPath,
              })
            }
          >
            Setup guide
          </Button>
        </PageToolbarPortal>
      )}
      <WebhookCreateForm
        createdActionLabel="Back to all webhooks"
        onGuideSelectionChange={setSetupGuideSelection}
        onReturn={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
        refetchQueries={['ObservabilityWebhooks', 'IssueWebhooks']}
        returnPathIsList
        onCreated={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
      />
    </>
  )
}
