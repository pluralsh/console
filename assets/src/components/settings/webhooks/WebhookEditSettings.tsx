import {
  Button,
  EmptyState,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  getSetupGuideDocumentationUrl,
  getSetupGuideMarkdownPath,
} from 'components/settings/webhooks/webhookCreateFormSetupGuides'
import { WebhookCreateForm } from 'components/settings/webhooks/WebhookCreateForm'
import {
  ExistingWebhook,
  SetupGuideSelection,
} from 'components/settings/webhooks/WebhookCreateFormTypes'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import {
  useIssueWebhookQuery,
  useObservabilityWebhookQuery,
} from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWebhooksSettingsEditAbsPath,
  WEBHOOKS_SETTINGS_ABS_PATH,
  WEBHOOKS_SETTINGS_WEBHOOK_ID_PARAM_ID,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'

import { SETTINGS_BREADCRUMBS } from '../Settings'
import { StackedTextSC } from '../../utils/table/StackedText'

export function WebhookEditSettings() {
  const navigate = useNavigate()
  const theme = useTheme()
  const params = useParams()
  const webhookId = params[WEBHOOKS_SETTINGS_WEBHOOK_ID_PARAM_ID]
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [setupGuideSelection, setSetupGuideSelection] =
    useState<SetupGuideSelection>({
      webhookType: 'observability',
      observabilityType: null,
      issueProvider: null,
    })

  const {
    data: observabilityData,
    loading: observabilityLoading,
    error: observabilityError,
  } = useObservabilityWebhookQuery({
    variables: { id: webhookId },
    skip: !webhookId,
    fetchPolicy: 'cache-and-network',
  })
  const {
    data: issueData,
    loading: issueLoading,
    error: issueError,
  } = useIssueWebhookQuery({
    variables: { id: webhookId },
    skip: !webhookId,
    fetchPolicy: 'cache-and-network',
  })

  const existingWebhook = useMemo<Nullable<ExistingWebhook>>(() => {
    const observabilityWebhook = observabilityData?.observabilityWebhook

    if (observabilityWebhook) {
      return {
        webhookType: 'observability',
        webhook: observabilityWebhook,
      }
    }

    const issueWebhook = issueData?.issueWebhook

    return issueWebhook
      ? {
          webhookType: 'issue',
          webhook: issueWebhook,
        }
      : null
  }, [issueData?.issueWebhook, observabilityData?.observabilityWebhook])

  const setupGuideMarkdownPath = getSetupGuideMarkdownPath(setupGuideSelection)
  const setupGuideDocumentationUrl =
    getSetupGuideDocumentationUrl(setupGuideSelection)
  const editPath = getWebhooksSettingsEditAbsPath({
    webhookId,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...SETTINGS_BREADCRUMBS,
        { label: 'webhooks', url: WEBHOOKS_SETTINGS_ABS_PATH },
        { label: 'edit webhook', url: editPath },
      ],
      [editPath]
    )
  )
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
              Edit webhook integration details and access policy.
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

  const loading = observabilityLoading || issueLoading
  const error =
    !loading && !existingWebhook ? observabilityError || issueError : undefined

  if (error) return <GqlError error={error} />
  if (loading && !existingWebhook) return <LoadingIndicator />

  return existingWebhook ? (
    <WebhookCreateForm
      existingWebhook={existingWebhook}
      mode="edit"
      onGuideSelectionChange={setSetupGuideSelection}
      onReturn={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
      onSaved={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
      refetchQueries={['ObservabilityWebhooks', 'IssueWebhooks']}
      returnPathIsList
      onCreated={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}
    />
  ) : (
    <EmptyState message="Webhook not found.">
      <Button onClick={() => navigate(WEBHOOKS_SETTINGS_ABS_PATH)}>
        Back to all webhooks
      </Button>
    </EmptyState>
  )
}
