import {
  Button,
  Checkbox,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  useCreateWorkbenchWebhookMutation,
  useObservabilityWebhooksQuery,
  useUpdateWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { Key, useMemo, useRef, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WEBHOOK_TRIGGER_REFETCH_QUERIES } from './WorkbenchTriggers'
import { isEqual } from 'lodash'

type MatchType = 'regex' | 'substring'

type WebhookTriggerFormState = {
  name: string
  webhookId: string
  matchType: MatchType
  regex: string
  substring: string
  caseInsensitive: boolean
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
  const tabStateRef = useRef<any>(undefined)

  const label = formState.name.trim()
  const webhookId = formState.webhookId
  const regex = formState.regex.trim()
  const substring = formState.substring.trim()
  const activeMatchValue = formState.matchType === 'regex' ? regex : substring

  const attributes = {
    name: label,
    webhookId,
    matches: activeMatchValue
      ? formState.matchType === 'regex'
        ? { regex: activeMatchValue }
        : {
            substring: activeMatchValue,
            caseInsensitive: formState.caseInsensitive,
          }
      : undefined,
  }

  const canSave =
    !!label &&
    !!webhookId &&
    !!activeMatchValue &&
    !isEqual(attributes, getAttributesFromState(getInitialFormState(webhook)))

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
          placeholder="Webhook label"
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
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: formState.matchType,
          onSelectionChange: (key: Key) =>
            setFormState((prev) => ({
              ...prev,
              matchType: String(key) as MatchType,
            })),
        }}
      >
        <Tab
          key="substring"
          textValue="Substring"
        >
          Substring
        </Tab>
        <Tab
          key="regex"
          textValue="Regex"
        >
          REGEX
        </Tab>
      </TabList>
      {formState.matchType === 'regex' ? (
        <FormField hint="Use a regex pattern to match against incoming event payloads. Supports syntax like ^alert\.triggered$.">
          <Input2
            value={formState.regex}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, regex: e.target.value }))
            }
            placeholder="REGEX"
          />
        </FormField>
      ) : (
        <>
          <FormField hint="Create a filter rule. Match events containing this exact string. Case insensitive option available below.">
            <Flex
              direction="column"
              gap="small"
            >
              <Input2
                value={formState.substring}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    substring: e.target.value,
                  }))
                }
                placeholder="Substring"
              />
            </Flex>
          </FormField>
          <Checkbox
            small
            checked={formState.caseInsensitive}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                caseInsensitive: e.target.checked,
              }))
            }
          >
            Case insensitive match
          </Checkbox>
        </>
      )}
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
  const matchType: MatchType = webhook?.matches?.regex ? 'regex' : 'substring'

  return {
    name: webhook?.name ?? '',
    webhookId: webhook?.webhook?.id ?? '',
    matchType,
    regex: webhook?.matches?.regex ?? '',
    substring: webhook?.matches?.substring ?? '',
    caseInsensitive: webhook?.matches?.caseInsensitive ?? false,
  }
}

function getAttributesFromState(formState: WebhookTriggerFormState) {
  const name = formState.name.trim()
  const webhookId = formState.webhookId
  const regex = formState.regex.trim()
  const substring = formState.substring.trim()
  const activeMatchValue = formState.matchType === 'regex' ? regex : substring

  return {
    name,
    webhookId,
    matches: activeMatchValue
      ? formState.matchType === 'regex'
        ? { regex: activeMatchValue }
        : {
            substring: activeMatchValue,
            caseInsensitive: formState.caseInsensitive,
          }
      : undefined,
  }
}
