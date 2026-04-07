import {
  Button,
  Flex,
  FormField,
  GitHubLogoIcon,
  GitLabLogoIcon,
  Input2,
  ListBoxItem,
  Select,
  TicketIcon,
  VisualInspectionIcon,
  WebhooksIcon,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
  useCreateIssueWebhookMutation,
  useUpsertObservabilityWebhookMutation,
} from 'generated/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { useState } from 'react'
import { getObservabilityWebhookTypeIcon } from '../../../settings/global/observability/EditObservabilityWebhook'
import { capitalize } from 'lodash'

type CreateWebhookType = 'observability' | 'issue'

type CreateWebhookFormState = {
  webhookType: CreateWebhookType
  observabilityType: Nullable<ObservabilityWebhookType>
  observabilityName: string
  observabilitySecret: string
  issueProvider: Nullable<IssueWebhookProvider>
  issueName: string
  issueUrl: string
  issueSecret: string
}

function getInitialCreateWebhookFormState(): CreateWebhookFormState {
  return {
    webhookType: 'observability',
    observabilityType: null,
    observabilityName: '',
    observabilitySecret: '',
    issueProvider: null,
    issueName: '',
    issueUrl: '',
    issueSecret: '',
  }
}

function getIssueWebhookProviderIcon(provider: Nullable<string>) {
  switch (provider) {
    case IssueWebhookProvider.Github:
      return <GitHubLogoIcon />
    case IssueWebhookProvider.Gitlab:
      return <GitLabLogoIcon />
    case IssueWebhookProvider.Jira:
    case IssueWebhookProvider.Linear:
    case IssueWebhookProvider.Asana:
    default:
      return <WebhooksIcon />
  }
}

function getWebhookTypeIcon(type: CreateWebhookType) {
  if (type === 'issue') return <TicketIcon />

  return <VisualInspectionIcon />
}

export function WorkbenchCreateWebhookForm({
  onBack,
  onCreated,
  refetchObservabilityWebhooks,
  refetchIssueWebhooks,
}: {
  onBack: () => void
  onCreated: (selectedWebhookKey: string) => void
  refetchObservabilityWebhooks: () => Promise<unknown>
  refetchIssueWebhooks: () => Promise<unknown>
}) {
  const { popToast } = useSimpleToast()
  const [formState, setFormState] = useState<CreateWebhookFormState>(
    getInitialCreateWebhookFormState
  )

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
    !!formState.issueUrl.trim() &&
    !!formState.issueSecret.trim()

  const canCreateWebhook =
    formState.webhookType === 'observability'
      ? canCreateObservabilityWebhook
      : canCreateIssueWebhook

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
      })

      const createdWebhook = response.data?.upsertObservabilityWebhook
      if (!createdWebhook) return

      await refetchObservabilityWebhooks()
      onCreated(`obs:${createdWebhook.id}`)
      popToast({
        name: createdWebhook.name,
        action: 'created',
        color: 'icon-success',
      })

      return
    }

    const response = await createIssueWebhook({
      variables: {
        attributes: {
          provider: formState.issueProvider!,
          name: formState.issueName.trim(),
          url: formState.issueUrl.trim(),
          secret: formState.issueSecret.trim(),
        },
      },
    })

    const createdWebhook = response.data?.createIssueWebhook
    if (!createdWebhook) return

    await refetchIssueWebhooks()
    onCreated(`issue:${createdWebhook.id}`)
    popToast({
      name: createdWebhook.name,
      action: 'created',
      color: 'icon-success',
    })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {error && <GqlError error={error} />}
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
                  label={capitalize(type)}
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
                  label={provider}
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
            label="URL"
            required
          >
            <Input2
              value={formState.issueUrl}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  issueUrl: e.target.value,
                }))
              }
            />
          </FormField>
          <FormField
            label="Secret"
            required
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
          onClick={onBack}
          disabled={isSaving}
        >
          Back
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
