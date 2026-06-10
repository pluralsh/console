import {
  FormField,
  Input2,
  ListBoxItem,
  Select,
  TicketIcon,
  VisualInspectionIcon,
} from '@pluralsh/design-system'
import { SecretInputWithGenerate } from 'components/utils/SecretInputWithGenerate'
import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
} from 'generated/graphql'
import { Dispatch, SetStateAction } from 'react'
import {
  humanizeIssueWebhookProvider,
  humanizeObservabilityWebhookType,
} from 'utils/webhookLabels'

import {
  CreateWebhookFormState,
  CreateWebhookType,
} from './WebhookCreateFormTypes'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './webhookIcons'

function getWebhookTypeIcon(type: CreateWebhookType) {
  if (type === 'issue') return <TicketIcon />

  return <VisualInspectionIcon />
}

export function WebhookCreateFormFields({
  formState,
  mode = 'create',
  setFormState,
}: {
  formState: CreateWebhookFormState
  mode?: 'create' | 'edit'
  setFormState: Dispatch<SetStateAction<CreateWebhookFormState>>
}) {
  return (
    <>
      <FormField
        label="Type of webhook"
        required
      >
        <Select
          selectedKey={formState.webhookType}
          label="Type of webhook"
          leftContent={getWebhookTypeIcon(formState.webhookType)}
          isDisabled={mode === 'edit'}
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
        <ObservabilityWebhookFields
          formState={formState}
          mode={mode}
          setFormState={setFormState}
        />
      ) : (
        <IssueWebhookFields
          formState={formState}
          mode={mode}
          setFormState={setFormState}
        />
      )}
    </>
  )
}

function ObservabilityWebhookFields({
  formState,
  mode,
  setFormState,
}: {
  formState: CreateWebhookFormState
  mode: 'create' | 'edit'
  setFormState: Dispatch<SetStateAction<CreateWebhookFormState>>
}) {
  return (
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
        required={mode === 'create'}
        hint={
          mode === 'edit'
            ? 'Leave blank to keep the existing secret.'
            : undefined
        }
      >
        <SecretInputWithGenerate
          masked
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
  )
}

function IssueWebhookFields({
  formState,
  mode,
  setFormState,
}: {
  formState: CreateWebhookFormState
  mode: 'create' | 'edit'
  setFormState: Dispatch<SetStateAction<CreateWebhookFormState>>
}) {
  return (
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
        required={mode === 'create'}
        hint={
          mode === 'edit'
            ? 'Leave blank to keep the existing secret.'
            : formState.issueProvider === IssueWebhookProvider.AzureDevops
              ? 'Use this value as the HTTP Basic authentication password in the Azure DevOps Web Hook action (HTTPS required). Any username is accepted.'
              : formState.issueProvider ===
                  IssueWebhookProvider.BitbucketDatacenter
                ? 'Use this value as the HTTP Basic authentication password in Bitbucket Data Center webhook settings. Any username is accepted.'
                : undefined
        }
      >
        <SecretInputWithGenerate
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
  )
}
