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
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'

type WebhookTriggerFormState = {
  name: string
  webhookId: string
}

export function WorkbenchWebhookTriggerForm({
  workbenchId,
  onCancel,
  onCompleted,
}: {
  workbenchId: string
  onCancel: () => void
  onCompleted: () => void | Promise<void>
}) {
  const [formState, setFormState] = useState<WebhookTriggerFormState>({
    name: '',
    webhookId: '',
  })
  const [finalizing, setFinalizing] = useState(false)

  const {
    data,
    loading: webhooksLoading,
    error: webhooksError,
  } = useObservabilityWebhooksQuery({ variables: { first: 100 } })
  const [createWorkbenchWebhook, createState] =
    useCreateWorkbenchWebhookMutation()

  const webhooks = useMemo(
    () => mapExistingNodes(data?.observabilityWebhooks),
    [data]
  )

  const label = formState.name.trim()
  const webhookId = formState.webhookId
  const isSaving = createState.loading || finalizing
  const error = webhooksError ?? createState.error
  const canSave = !!label && !!webhookId && !isSaving

  const handleSave = async () => {
    if (!canSave) return

    setFinalizing(true)

    try {
      await createWorkbenchWebhook({
        variables: {
          workbenchId,
          attributes: {
            name: label,
            webhookId,
          },
        },
      })

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
      <FormField
        label="Label*"
        hint="Used as the trigger name for this workbench webhook."
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
        label="Webhook*"
        hint="Select an existing observability webhook."
      >
        <Select
          selectedKey={formState.webhookId || null}
          onSelectionChange={(key) =>
            setFormState((prev) => ({ ...prev, webhookId: String(key ?? '') }))
          }
          selectionMode="single"
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
