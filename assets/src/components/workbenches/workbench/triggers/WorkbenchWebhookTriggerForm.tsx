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
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  useCreateWorkbenchWebhookMutation,
  useObservabilityWebhooksQuery,
  useUpdateWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WEBHOOK_TRIGGER_REFETCH_QUERIES } from './WorkbenchTriggers'
import { isEqual } from 'lodash'

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
  onCompleted?: Nullable<() => void>
}) {
  const editing = !!webhook
  const [formState, setFormState] = useState<WebhookTriggerFormState>(() =>
    getInitialFormState(webhook)
  )
  const { popToast } = useSimpleToast()

  const {
    data,
    loading: webhooksLoading,
    error: webhooksError,
  } = useObservabilityWebhooksQuery({ variables: { first: 100 } })

  const webhooks = useMemo(
    () => mapExistingNodes(data?.observabilityWebhooks),
    [data]
  )

  const label = formState.name.trim()
  const webhookId = formState.webhookId

  const canSave =
    !!label && !!webhookId && !isEqual(formState, getInitialFormState(webhook))
  const attributes = { name: label, webhookId }

  const handleCompleted = () => {
    onCompleted?.()
    popToast({
      name: label,
      action: editing ? 'updated' : 'created',
      color: 'icon-success',
    })
  }
  const [createWorkbenchWebhook, createState] =
    useCreateWorkbenchWebhookMutation({
      variables: { workbenchId, attributes },
      onCompleted: handleCompleted,
      refetchQueries: WEBHOOK_TRIGGER_REFETCH_QUERIES,
      awaitRefetchQueries: true,
    })
  const [updateWorkbenchWebhook, updateState] =
    useUpdateWorkbenchWebhookMutation({
      variables: { id: webhook?.id ?? '', attributes },
      onCompleted: handleCompleted,
      refetchQueries: WEBHOOK_TRIGGER_REFETCH_QUERIES,
      awaitRefetchQueries: true,
    })

  const isSaving = createState.loading || updateState.loading
  const error = webhooksError ?? createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (editing && webhook) updateWorkbenchWebhook()
    else createWorkbenchWebhook()
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
    >
      {error && <GqlError error={error} />}
      <FormField
        required
        label="Webhook label"
      >
        <Input2
          value={formState.name}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Webhook trigger name"
        />
      </FormField>
      <FormField
        required
        label="Select webhook"
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
      <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
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
