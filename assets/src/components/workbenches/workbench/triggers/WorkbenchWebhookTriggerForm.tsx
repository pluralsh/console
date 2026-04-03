import {
  Button,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  useCreateWorkbenchWebhookMutation,
  useObservabilityWebhooksQuery,
  useUpdateWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'

type WebhookTriggerFormState = {
  name: string
  webhookId: string
}

export function WorkbenchWebhookTriggerForm({
  workbenchId,
  webhook,
  onCancel,
  onCompleted,
}: {
  workbenchId: string
  webhook?: Nullable<WorkbenchWebhookFragment>
  onCancel: () => void
  onCompleted: () => void | Promise<void>
}) {
  const editing = !!webhook
  const [formState, setFormState] = useState<WebhookTriggerFormState>(() =>
    getInitialFormState(webhook)
  )
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    setFormState(getInitialFormState(webhook))
  }, [webhook])

  const {
    data,
    loading: webhooksLoading,
    error: webhooksError,
  } = useObservabilityWebhooksQuery({ variables: { first: 100 } })
  const [createWorkbenchWebhook, createState] =
    useCreateWorkbenchWebhookMutation()
  const [updateWorkbenchWebhook, updateState] =
    useUpdateWorkbenchWebhookMutation()

  const webhooks = useMemo(
    () => mapExistingNodes(data?.observabilityWebhooks),
    [data]
  )

  const label = formState.name.trim()
  const webhookId = formState.webhookId
  const isSaving = createState.loading || updateState.loading || finalizing
  const error = webhooksError ?? createState.error ?? updateState.error
  const canSave = !!label && !!webhookId && !isSaving

  const handleSave = async () => {
    if (!canSave) return

    setFinalizing(true)

    try {
      const attributes = { name: label, webhookId }

      if (editing && webhook) {
        await updateWorkbenchWebhook({
          variables: { id: webhook.id, attributes },
        })
      } else {
        await createWorkbenchWebhook({ variables: { workbenchId, attributes } })
      }

      await onCompleted()
    } catch {
      setFinalizing(false)
    }
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      css={{ width: '100%' }}
    >
      {error && <GqlError error={error} />}
      <FormField label="Webhook label*">
        <Input2
          value={formState.name}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Webhook trigger name"
        />
      </FormField>
      <FormField
        label="Select webhook*"
        hint="New webhooks added will appear in this list."
      >
        <Select
          selectedKey={formState.webhookId || null}
          onSelectionChange={(key) =>
            setFormState((prev) => ({ ...prev, webhookId: String(key ?? '') }))
          }
          label="Webhook"
          isDisabled={webhooksLoading || webhooks.length === 0}
        >
          {webhooks.map((webhook) => (
            <ListBoxItem
              key={webhook.id}
              label={webhook.name}
            />
          ))}
        </Select>
      </FormField>
      <StickyActionsFooterSC>
        <Flex
          gap="small"
          css={{ marginLeft: 'auto' }}
        >
          <Button
            secondary
            startIcon={<ReturnIcon />}
            onClick={onCancel}
            disabled={isSaving}
          >
            Back to all webhooks
          </Button>
          <Button
            onClick={() => handleSave()}
            loading={isSaving}
            disabled={!canSave}
          >
            Save
          </Button>
        </Flex>
      </StickyActionsFooterSC>
    </Flex>
  )
}

function getInitialFormState(
  webhook?: Nullable<WorkbenchWebhookFragment>
): WebhookTriggerFormState {
  return {
    name: webhook?.name ?? '',
    webhookId: webhook?.webhook?.id ?? '',
  }
}
