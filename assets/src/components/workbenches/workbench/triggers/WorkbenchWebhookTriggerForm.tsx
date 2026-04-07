import {
  Button,
  Checkbox,
  Chip,
  DatadogLogoIcon,
  Flex,
  FormField,
  GitHubLogoIcon,
  GitLabLogoIcon,
  GrafanaLogoIcon,
  Input2,
  ListBoxItem,
  NewrelicLogoIcon,
  PagerdutyLogoIcon,
  ReturnIcon,
  Select,
  SentryLogoIcon,
  Tab,
  TabList,
  VisualInspectionIcon,
  WebhooksIcon,
  TicketIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  useCreateWorkbenchWebhookMutation,
  useIssueWebhooksQuery,
  useObservabilityWebhooksQuery,
  useUpdateWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
  IssueWebhookProvider,
  ObservabilityWebhookType,
} from 'generated/graphql'
import { Key, useMemo, useRef, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { StickyActionsFooterSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WEBHOOK_TRIGGER_REFETCH_QUERIES } from './WorkbenchTriggers'
import { isEqual, isEmpty } from 'lodash'

type MatchType = 'regex' | 'substring'

// Prefixed key used in the Select: 'obs:{id}' for observability webhooks, 'issue:{id}' for issue webhooks
type WebhookTriggerFormState = {
  name: string
  selectedWebhookKey: string
  matchType: MatchType
  regex: string
  substring: string
  caseInsensitive: boolean
}

function parseWebhookKey(key: string): {
  webhookId?: string
  issueWebhookId?: string
} {
  if (key.startsWith('obs:')) return { webhookId: key.slice(4) }
  if (key.startsWith('issue:')) return { issueWebhookId: key.slice(6) }
  return {}
}

function getObservabilityWebhookTypeIcon(type: Nullable<string>) {
  switch (type) {
    case ObservabilityWebhookType.Grafana:
      return <GrafanaLogoIcon fullColor />
    case ObservabilityWebhookType.Datadog:
      return <DatadogLogoIcon fullColor />
    case ObservabilityWebhookType.Newrelic:
      return <NewrelicLogoIcon fullColor />
    case ObservabilityWebhookType.Pagerduty:
      return <PagerdutyLogoIcon fullColor />
    case ObservabilityWebhookType.Sentry:
      return <SentryLogoIcon />
    case ObservabilityWebhookType.Plural:
    default:
      return <WebhooksIcon />
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

  // TODO: Add pagination for webhook queries.
  const {
    data: obsData,
    loading: obsLoading,
    error: obsError,
  } = useObservabilityWebhooksQuery({ variables: { first: 100 } })

  const {
    data: issueData,
    loading: issueLoading,
    error: issueWebhooksError,
  } = useIssueWebhooksQuery({ variables: { first: 100 } })

  const observabilityWebhooks = useMemo(
    () => mapExistingNodes(obsData?.observabilityWebhooks),
    [obsData]
  )
  const issueWebhooks = useMemo(
    () => mapExistingNodes(issueData?.issueWebhooks),
    [issueData]
  )
  const webhooksLoading = obsLoading || issueLoading

  const tabStateRef = useRef<any>(undefined)

  const label = formState.name.trim()
  const selectedWebhookKey = formState.selectedWebhookKey
  const regex = formState.regex.trim()
  const substring = formState.substring.trim()
  const activeMatchValue = formState.matchType === 'regex' ? regex : substring

  const attributes = {
    name: label,
    ...parseWebhookKey(selectedWebhookKey),
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
    !!selectedWebhookKey &&
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
  const error =
    obsError ?? issueWebhooksError ?? createState.error ?? updateState.error

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
          selectedKey={formState.selectedWebhookKey || null}
          onSelectionChange={(key) =>
            setFormState((prev) => ({
              ...prev,
              selectedWebhookKey: String(key ?? ''),
            }))
          }
          label="Webhook"
          isDisabled={
            webhooksLoading ||
            (isEmpty(observabilityWebhooks) && isEmpty(issueWebhooks))
          }
        >
          {[
            ...observabilityWebhooks.map((wh) => (
              <ListBoxItem
                key={`obs:${wh.id}`}
                leftContent={getObservabilityWebhookTypeIcon(wh.type)}
                rightContent={
                  <Chip
                    size="small"
                    inactive
                    icon={<VisualInspectionIcon />}
                    iconColor="icon-xlight"
                    css={{ borderRadius: 11 }}
                  >
                    Observability
                  </Chip>
                }
                label={wh.name}
              />
            )),
            ...issueWebhooks.map((wh) => (
              <ListBoxItem
                key={`issue:${wh.id}`}
                leftContent={getIssueWebhookProviderIcon(wh.provider)}
                rightContent={
                  <Chip
                    size="small"
                    inactive
                    icon={<TicketIcon />}
                    iconColor="icon-xlight"
                    css={{ borderRadius: 11 }}
                  >
                    Ticketing
                  </Chip>
                }
                label={wh.name}
              />
            )),
          ]}
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

  let selectedWebhookKey = ''
  if (webhook?.webhook?.id) selectedWebhookKey = `obs:${webhook.webhook.id}`
  else if (webhook?.issueWebhook?.id)
    selectedWebhookKey = `issue:${webhook.issueWebhook.id}`

  return {
    name: webhook?.name ?? '',
    selectedWebhookKey,
    matchType,
    regex: webhook?.matches?.regex ?? '',
    substring: webhook?.matches?.substring ?? '',
    caseInsensitive: webhook?.matches?.caseInsensitive ?? false,
  }
}

function getAttributesFromState(formState: WebhookTriggerFormState) {
  const name = formState.name.trim()
  const regex = formState.regex.trim()
  const substring = formState.substring.trim()
  const activeMatchValue = formState.matchType === 'regex' ? regex : substring

  return {
    name,
    ...parseWebhookKey(formState.selectedWebhookKey),
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
