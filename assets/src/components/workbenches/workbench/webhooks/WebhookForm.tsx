import {
  Button,
  Codeline,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
  SidePanelOpenIcon,
  TicketIcon,
  VisualInspectionIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  IssueWebhook,
  IssueWebhookProvider,
  ObservabilityWebhook,
  ObservabilityWebhookType,
  useCreateIssueWebhookMutation,
  useUpsertObservabilityWebhookMutation,
  useWorkbenchQuery,
} from 'generated/graphql'
import queryString from 'query-string'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchWebhookTriggersAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import { WebhookTriggerFormState } from './WebhookTriggerForm'
import { getObservabilityWebhookTypeIcon } from '../../../settings/global/observability/EditObservabilityWebhook'
import { getIssueWebhookProviderIcon } from './utils'
import {
  humanizeIssueWebhookProvider,
  humanizeObservabilityWebhookType,
} from 'utils/webhookLabels'
import { useWebhookSetupGuidePanel } from './WebhookSetupGuidePanel'
import { Body2P } from 'components/utils/typography/Text'

type CreateWebhookType = 'observability' | 'issue'

type CreateWebhookFormState = {
  webhookType: CreateWebhookType
  observabilityType: Nullable<ObservabilityWebhookType>
  observabilityName: string
  observabilitySecret: string
  issueProvider: Nullable<IssueWebhookProvider>
  issueName: string
  issueSecret: string
}

type RouteState = {
  returnPath?: string
  draftState?: WebhookTriggerFormState
}

type SetupGuideSelection = {
  webhookType: CreateWebhookType
  observabilityType: Nullable<ObservabilityWebhookType>
  issueProvider: Nullable<IssueWebhookProvider>
}

const OBSERVABILITY_SETUP_GUIDE_PATHS: Record<
  ObservabilityWebhookType,
  string
> = {
  [ObservabilityWebhookType.Datadog]: '/setup-guides/webhooks/datadog.md',
  [ObservabilityWebhookType.Grafana]: '/setup-guides/webhooks/grafana.md',
  [ObservabilityWebhookType.Newrelic]: '/setup-guides/webhooks/newrelic.md',
  [ObservabilityWebhookType.Pagerduty]: '/setup-guides/webhooks/pagerduty.md',
  [ObservabilityWebhookType.Plural]: '/setup-guides/webhooks/plural.md',
  [ObservabilityWebhookType.Sentry]: '/setup-guides/webhooks/sentry.md',
}

const ISSUE_SETUP_GUIDE_PATHS: Record<IssueWebhookProvider, string> = {
  [IssueWebhookProvider.Asana]: '/setup-guides/webhooks/asana.md',
  [IssueWebhookProvider.AzureDevops]: '/setup-guides/webhooks/azure_devops.md',
  [IssueWebhookProvider.Github]: '/setup-guides/webhooks/github.md',
  [IssueWebhookProvider.Gitlab]: '/setup-guides/webhooks/gitlab.md',
  [IssueWebhookProvider.Jira]: '/setup-guides/webhooks/jira.md',
  [IssueWebhookProvider.Linear]: '/setup-guides/webhooks/linear.md',
}

const OBSERVABILITY_SETUP_GUIDE_DOCUMENTATION_URLS: Partial<
  Record<ObservabilityWebhookType, string>
> = {
  [ObservabilityWebhookType.Datadog]:
    'https://docs.plural.sh/plural-features/observability/observability-webhooks/datadog',
  [ObservabilityWebhookType.Grafana]:
    'https://docs.plural.sh/plural-features/observability/observability-webhooks/grafana',
}

const ISSUE_SETUP_GUIDE_DOCUMENTATION_URLS: Partial<
  Record<IssueWebhookProvider, string>
> = {
  [IssueWebhookProvider.AzureDevops]:
    'https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops',
}

function getSetupGuideMarkdownPath({
  webhookType,
  observabilityType,
  issueProvider,
}: SetupGuideSelection): Nullable<string> {
  if (webhookType === 'observability') {
    if (!observabilityType) return null

    return OBSERVABILITY_SETUP_GUIDE_PATHS[observabilityType] ?? null
  }

  if (!issueProvider) return null

  return ISSUE_SETUP_GUIDE_PATHS[issueProvider] ?? null
}

function getSetupGuideDocumentationUrl({
  webhookType,
  observabilityType,
  issueProvider,
}: SetupGuideSelection): string | undefined {
  if (webhookType === 'observability' && observabilityType) {
    return OBSERVABILITY_SETUP_GUIDE_DOCUMENTATION_URLS[observabilityType]
  }

  if (webhookType === 'issue' && issueProvider) {
    return ISSUE_SETUP_GUIDE_DOCUMENTATION_URLS[issueProvider]
  }

  return undefined
}

function getInitialCreateWebhookFormState(): CreateWebhookFormState {
  return {
    webhookType: 'observability',
    observabilityType: null,
    observabilityName: '',
    observabilitySecret: '',
    issueProvider: null,
    issueName: '',
    issueSecret: '',
  }
}

function getWebhookTypeIcon(type: CreateWebhookType) {
  if (type === 'issue') return <TicketIcon />

  return <VisualInspectionIcon />
}

function buildReturnPath({
  returnPath,
  selectedWebhook,
}: {
  returnPath: string
  selectedWebhook?: string
}) {
  if (!selectedWebhook) return returnPath

  const { url, query, fragmentIdentifier } = queryString.parseUrl(returnPath)

  return queryString.stringifyUrl({
    url,
    query: {
      ...query,
      [WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM]: selectedWebhook,
    },
    fragmentIdentifier,
  })
}

export function WebhookForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const routeState = location.state as Nullable<RouteState>
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
  const listPath = getWorkbenchWebhookTriggersAbsPath(workbenchId)
  const returnPath = routeState?.returnPath ?? listPath

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'webhook trigger',
          url: getWorkbenchWebhookTriggersAbsPath(workbenchId),
        },
        { label: 'create webhook' },
      ],
      [workbench, workbenchId]
    )
  )

  const error = workbenchError

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

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        direction="column"
        gap="large"
        width="100%"
        css={{ maxWidth: 750, marginInline: 'auto' }}
      >
        <StackedText
          loading={!workbenchData && workbenchLoading}
          first={workbench?.name}
          firstPartialType="subtitle2"
          firstColor="text"
          second={workbench?.description}
          secondPartialType="body2"
          secondColor="text-xlight"
          gap="xxsmall"
        />
        <Flex gap="medium">
          <Flex
            direction="column"
            width="100%"
          >
            {!workbenchData && workbenchLoading ? (
              <RectangleSkeleton
                $width="100%"
                $height={300}
              />
            ) : (
              <FormCardSC>
                <CreateWebhookForm
                  onGuideSelectionChange={setSetupGuideSelection}
                  onReturn={() =>
                    navigate(returnPath, {
                      state: { draftState: routeState?.draftState },
                    })
                  }
                  returnPathIsList={returnPath === listPath}
                  onCreated={(selectedWebhookKey) => {
                    navigate(
                      buildReturnPath({
                        returnPath,
                        selectedWebhook: selectedWebhookKey,
                      }),
                      {
                        state: { draftState: routeState?.draftState },
                      }
                    )
                  }}
                />
              </FormCardSC>
            )}
          </Flex>
          {!isOpen && !!setupGuideMarkdownPath && (
            <div css={{ width: 200 }}>
              <Button
                secondary
                startIcon={<SidePanelOpenIcon />}
                onClick={() =>
                  openSetupGuidePanel({
                    documentationUrl: setupGuideDocumentationUrl,
                    markdownPath: setupGuideMarkdownPath,
                  })
                }
                width="100%"
                css={{ whiteSpace: 'nowrap' }}
              >
                Setup Guide
              </Button>
            </div>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}

function CreateWebhookForm({
  onGuideSelectionChange,
  onReturn,
  returnPathIsList,
  onCreated,
}: {
  onGuideSelectionChange: (selection: SetupGuideSelection) => void
  onReturn: () => void
  returnPathIsList?: boolean
  onCreated: (selectedWebhookKey: string) => void
}) {
  const { popToast } = useSimpleToast()
  const [formState, setFormState] = useState<CreateWebhookFormState>(
    getInitialCreateWebhookFormState
  )
  const [newWebHook, setNewWebHook] =
    useState<Nullable<IssueWebhook | ObservabilityWebhook>>(null)

  const [upsertObservabilityWebhook, upsertObservabilityWebhookState] =
    useUpsertObservabilityWebhookMutation()
  const [createIssueWebhook, createIssueWebhookState] =
    useCreateIssueWebhookMutation()

  const isSaving =
    upsertObservabilityWebhookState.loading || createIssueWebhookState.loading

  const error =
    upsertObservabilityWebhookState.error ?? createIssueWebhookState.error

  const canCreateObservabilityWebhook =
    !!formState.observabilityType &&
    !!formState.observabilityName.trim() &&
    !!formState.observabilitySecret.trim()

  const canCreateIssueWebhook =
    !!formState.issueProvider &&
    !!formState.issueName.trim() &&
    !!formState.issueSecret.trim()

  const canCreateWebhook =
    formState.webhookType === 'observability'
      ? canCreateObservabilityWebhook
      : canCreateIssueWebhook

  useEffect(() => {
    onGuideSelectionChange({
      webhookType: formState.webhookType,
      observabilityType: formState.observabilityType,
      issueProvider: formState.issueProvider,
    })
  }, [
    formState.webhookType,
    formState.observabilityType,
    formState.issueProvider,
    onGuideSelectionChange,
  ])

  const handleCreateNewWebhook = async () => {
    if (!canCreateWebhook) return

    if (formState.webhookType === 'observability') {
      const response = await upsertObservabilityWebhook({
        variables: {
          attributes: {
            type: formState.observabilityType!,
            name: formState.observabilityName.trim(),
            secret: formState.observabilitySecret.trim(),
          },
        },
        refetchQueries: ['WorkbenchWebhooks', 'WorkbenchTriggersSummary'],
        awaitRefetchQueries: true,
      })

      const createdWebhook = response.data?.upsertObservabilityWebhook
      if (!createdWebhook) return

      setNewWebHook(createdWebhook)
      popToast({
        content: `${createdWebhook.name} created`,
        severity: 'success',
      })

      return
    }

    const response = await createIssueWebhook({
      variables: {
        attributes: {
          provider: formState.issueProvider!,
          name: formState.issueName.trim(),
          secret: formState.issueSecret.trim(),
        },
      },
      refetchQueries: ['WorkbenchWebhooks', 'WorkbenchTriggersSummary'],
      awaitRefetchQueries: true,
    })

    const createdWebhook = response.data?.createIssueWebhook
    if (!createdWebhook) return

    setNewWebHook(createdWebhook)
    popToast({
      content: `${createdWebhook.name} created`,
      severity: 'success',
    })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {error && <GqlError error={error} />}
      {newWebHook && !error && (
        <>
          <Body2P>
            {`Add a new webhook in your ${formState.webhookType === 'observability' ? 'observability provider' : 'ticketing provider'} with the
            following url and validation secret`}
          </Body2P>
          <FormField label="Webhook URL">
            <Codeline>{newWebHook.url}</Codeline>
          </FormField>
          <FormField label="Secret">
            <Codeline>
              {formState.webhookType === 'observability'
                ? formState.observabilitySecret
                : formState.issueSecret}
            </Codeline>
          </FormField>
          <Button
            startIcon={returnPathIsList ? <ReturnIcon /> : undefined}
            onClick={() =>
              onCreated(
                `${formState.webhookType === 'observability' ? 'obs' : 'issue'}:${newWebHook.id}`
              )
            }
            disabled={isSaving}
          >
            Attach Your Webhook
          </Button>
        </>
      )}
      <FormField
        label="Type of webhook"
        required
      >
        <Select
          selectedKey={formState.webhookType}
          label="Type of webhook"
          leftContent={getWebhookTypeIcon(formState.webhookType)}
          onSelectionChange={(key) =>
            setFormState((prev) => ({
              ...prev,
              webhookType: String(key) as CreateWebhookType,
            }))
          }
        >
          <ListBoxItem
            key="observability"
            leftContent={<VisualInspectionIcon />}
            label="Observability"
          />
          <ListBoxItem
            key="issue"
            leftContent={<TicketIcon />}
            label="Ticketing"
          />
        </Select>
      </FormField>
      {formState.webhookType === 'observability' ? (
        <>
          <FormField
            label="Provider type"
            required
          >
            <Select
              selectedKey={formState.observabilityType}
              label="Provider type"
              leftContent={getObservabilityWebhookTypeIcon(
                formState.observabilityType
              )}
              onSelectionChange={(key) =>
                setFormState((prev) => ({
                  ...prev,
                  observabilityType: key as ObservabilityWebhookType,
                }))
              }
            >
              {Object.values(ObservabilityWebhookType).map((type) => (
                <ListBoxItem
                  key={type}
                  leftContent={getObservabilityWebhookTypeIcon(type)}
                  label={humanizeObservabilityWebhookType(type)}
                />
              ))}
            </Select>
          </FormField>
          <FormField
            label="Name"
            required
          >
            <Input2
              value={formState.observabilityName}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  observabilityName: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Secret"
            required
          >
            <InputRevealer
              defaultRevealed={false}
              value={formState.observabilitySecret}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  observabilitySecret: e.target.value,
                }))
              }
            />
          </FormField>
        </>
      ) : (
        <>
          <FormField
            label="Provider type"
            required
          >
            <Select
              selectedKey={formState.issueProvider}
              label="Provider type"
              leftContent={getIssueWebhookProviderIcon(formState.issueProvider)}
              onSelectionChange={(key) =>
                setFormState((prev) => ({
                  ...prev,
                  issueProvider: key as IssueWebhookProvider,
                }))
              }
            >
              {Object.values(IssueWebhookProvider).map((provider) => (
                <ListBoxItem
                  key={provider}
                  leftContent={getIssueWebhookProviderIcon(provider)}
                  label={humanizeIssueWebhookProvider(provider)}
                />
              ))}
            </Select>
          </FormField>
          <FormField
            label="Name"
            required
          >
            <Input2
              value={formState.issueName}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  issueName: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Secret"
            required
            hint={
              formState.issueProvider === IssueWebhookProvider.AzureDevops
                ? 'Use this value as the HTTP Basic authentication password in the Azure DevOps Web Hook action (HTTPS required). Any username is accepted.'
                : undefined
            }
          >
            <Input2
              value={formState.issueSecret}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  issueSecret: e.target.value,
                }))
              }
            />
          </FormField>
        </>
      )}
      <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
        <Button
          secondary
          startIcon={returnPathIsList ? <ReturnIcon /> : undefined}
          onClick={onReturn}
          disabled={isSaving}
        >
          {returnPathIsList ? 'Back to all webhooks' : 'Back'}
        </Button>
        <Button
          onClick={() => void handleCreateNewWebhook()}
          loading={isSaving}
          disabled={!canCreateWebhook}
        >
          Create new webhook
        </Button>
      </StickyActionsFooterSC>
    </Flex>
  )
}
