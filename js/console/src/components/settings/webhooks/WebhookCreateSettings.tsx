import {
  Button,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import {
  getSetupGuideDocumentationUrl,
  getSetupGuideMarkdownPath,
} from 'components/settings/webhooks/webhookCreateFormSetupGuides'
import { WebhookCreateForm } from 'components/settings/webhooks/WebhookCreateForm'
import { SetupGuideSelection } from 'components/settings/webhooks/WebhookCreateFormTypes'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  WEBHOOKS_SETTINGS_ABS_PATH,
  WEBHOOKS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'

import { SETTINGS_BREADCRUMBS } from '../Settings'
import { StackedTextSC } from '../../utils/table/StackedText'

const WEBHOOKS_SETTINGS_CREATE_BREADCRUMBS = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'webhooks', url: WEBHOOKS_SETTINGS_ABS_PATH },
  { label: 'create webhook', url: WEBHOOKS_SETTINGS_CREATE_ABS_PATH },
]

export function WebhookCreateSettings() {
  const navigate = useNavigate()
  const theme = useTheme()
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
              Create a webhook integration for observability or ticketing
              events.
            </span>
          </StackedTextSC>
          {!isOpen && !!setupGuideMarkdownPath && (
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              onClick={() =>
                openSetupGuidePanel({
                  documentationUrl: setupGuideDocumentationUrl,
                  markdownPath: setupGuideMarkdownPath,
                })
              }
              css={{ whiteSpace: 'nowrap' }}
            >
              Setup guide
            </Button>
          )}
        </Flex>
      ),
      [
        isOpen,
        openSetupGuidePanel,
        setupGuideDocumentationUrl,
        setupGuideMarkdownPath,
        theme,
      ]
    )
  )

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
    <WebhookCreateForm
      createdActionLabel="Back to all webhooks"
      onGuideSelectionChange={setSetupGuideSelection}
      onReturn={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
      refetchQueries={['ObservabilityWebhooks', 'IssueWebhooks']}
      returnPathIsList
      onCreated={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
    />
  )
}
