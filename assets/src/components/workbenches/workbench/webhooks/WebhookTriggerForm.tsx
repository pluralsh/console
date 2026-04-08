import {
  Button,
  Checkbox,
  Chip,
  EmptyState,
  Flex,
  FormField,
  Input2,
  ListBoxFooter,
  ListBoxItem,
  PlusIcon,
  ReturnIcon,
  Select,
  Tab,
  TabList,
  TicketIcon,
  VisualInspectionIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  WorkbenchWebhookFragment,
  useCreateWorkbenchWebhookMutation,
  useGetWorkbenchWebhookMutation,
  useIssueWebhooksQuery,
  useObservabilityWebhooksQuery,
  useUpdateWorkbenchWebhookMutation,
  useWorkbenchQuery,
} from 'generated/graphql'
import { isEmpty, isEqual } from 'lodash'
import { InlineA } from 'components/utils/typography/Text'
import { Key, useEffect, useMemo, useRef, useState } from 'react'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  getWorkbenchWebhookTriggerCreateWebhookAbsPath,
  getWorkbenchWebhookTriggersAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM,
  WORKBENCHES_WEBHOOK_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './utils'

type MatchType = 'regex' | 'substring'

// Prefixed key used in the Select: 'obs:{id}' for observability webhooks, 'issue:{id}' for issue webhooks
export type WebhookTriggerFormState = {
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

type RouteState = {
  draftState?: WebhookTriggerFormState
}

export function WebhookTriggerForm({ mode }: { mode: 'create' | 'edit' }) {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const webhookId = useParams()[WORKBENCHES_WEBHOOK_PARAM_ID]
  const routeState = location.state as Nullable<RouteState>
  const webhookKeyParam =
    searchParams.get(WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM) ?? undefined

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const [fetchWorkbenchWebhook, fetchWorkbenchWebhookState] =
    useGetWorkbenchWebhookMutation()

  useEffect(() => {
    if (mode === 'edit' && !!webhookId)
      fetchWorkbenchWebhook({ variables: { id: webhookId } })
  }, [fetchWorkbenchWebhook, mode, webhookId])

  const webhook = fetchWorkbenchWebhookState.data?.getWorkbenchWebhook
  const editing = !!webhook

  // Source form state is based on the location state (if coming back from create webhook page) or the fetched webhook (if editing),
  // with the selected webhook key from the query param taking precedence if present.
  const sourceFormState = useMemo(
    () => ({
      ...(routeState?.draftState ?? getInitialFormState(webhook)),
      ...(webhookKeyParam ? { selectedWebhookKey: webhookKeyParam } : {}),
    }),
    [routeState?.draftState, webhookKeyParam, webhook]
  )

  // Local form draft state that can be modified as the user interacts with the form.
  const [formDraft, setFormDraft] =
    useState<Nullable<WebhookTriggerFormState>>(null)

  const formState = formDraft ?? sourceFormState

  // Updater that works with both the form draft (when it exists) and the source form state,
  // allowing us to keep the draft in sync with changes to the source.
  // This ensures that if the user goes to create a new webhook, selects it, and comes back, the form will update to
  // reflect the newly selected webhook while still preserving any unsaved changes they made to other fields in the form.
  const setFormState = (
    updater: (prev: WebhookTriggerFormState) => WebhookTriggerFormState
  ) => {
    setFormDraft((prevDraft) => updater(prevDraft ?? sourceFormState))
  }

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
  const selectedWebhookIcon = useMemo(() => {
    const selectedKey = formState.selectedWebhookKey
    if (!selectedKey) return undefined

    if (selectedKey.startsWith('obs:')) {
      const selectedWebhook = observabilityWebhooks.find(
        (wh) => `obs:${wh.id}` === selectedKey
      )

      return selectedWebhook
        ? getObservabilityWebhookTypeIcon(selectedWebhook.type)
        : undefined
    }

    if (selectedKey.startsWith('issue:')) {
      const selectedWebhook = issueWebhooks.find(
        (wh) => `issue:${wh.id}` === selectedKey
      )

      return selectedWebhook
        ? getIssueWebhookProviderIcon(selectedWebhook.provider)
        : undefined
    }

    return undefined
  }, [formState.selectedWebhookKey, observabilityWebhooks, issueWebhooks])

  const webhooksLoading = obsLoading || issueLoading
  const tabStateRef = useRef<any>(undefined)

  const label = formState.name.trim()
  const selectedWebhookKeyValue = formState.selectedWebhookKey
  const regex = formState.regex.trim()
  const substring = formState.substring.trim()
  const activeMatchValue = formState.matchType === 'regex' ? regex : substring

  const attributes = {
    name: label,
    ...parseWebhookKey(selectedWebhookKeyValue),
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
    !!selectedWebhookKeyValue &&
    !!activeMatchValue &&
    !isEqual(attributes, getAttributesFromState(getInitialFormState(webhook)))

  const handleCompleted = () => {
    popToast({
      name: label,
      action: editing ? 'updated' : 'created',
      color: 'icon-success',
    })

    navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
  }

  const [createWorkbenchWebhook, createState] =
    useCreateWorkbenchWebhookMutation({
      variables: { workbenchId, attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchWebhooks', 'WorkbenchTriggersSummary'],
      awaitRefetchQueries: true,
    })
  const [updateWorkbenchWebhook, updateState] =
    useUpdateWorkbenchWebhookMutation({
      variables: { id: webhook?.id ?? '', attributes },
      onCompleted: handleCompleted,
      refetchQueries: ['WorkbenchWebhooks', 'WorkbenchTriggersSummary'],
      awaitRefetchQueries: true,
    })

  const isSaving = createState.loading || updateState.loading
  const formError =
    obsError ?? issueWebhooksError ?? createState.error ?? updateState.error

  const handleSave = () => {
    if (!canSave) return
    if (editing && webhook) updateWorkbenchWebhook()
    else createWorkbenchWebhook()
  }

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'webhook trigger',
          url: getWorkbenchWebhookTriggersAbsPath(workbenchId),
        },
        { label: mode === 'create' ? 'create' : 'edit' },
      ],
      [mode, workbench, workbenchId]
    )
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  if (fetchWorkbenchWebhookState.error)
    return <GqlError error={fetchWorkbenchWebhookState.error} />

  if (mode === 'edit' && !fetchWorkbenchWebhookState.loading && !webhook)
    return (
      <EmptyState message="Webhook trigger not found">
        <Button
          startIcon={<ReturnIcon />}
          onClick={() =>
            navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
          }
        >
          Back to all webhooks
        </Button>
      </EmptyState>
    )

  const isLoading =
    (!workbenchData && workbenchLoading) ||
    (mode === 'edit' && fetchWorkbenchWebhookState.loading)

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
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
      <Flex
        direction="column"
        width="100%"
        css={{ maxWidth: 750 }}
      >
        {isLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height={300}
          />
        ) : (
          <FormCardSC>
            <Flex
              direction="column"
              gap="large"
              height="100%"
              width="100%"
            >
              {formError && <GqlError error={formError} />}
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
              <Flex
                direction="column"
                gap="small"
              >
                <Flex
                  align="center"
                  justify="space-between"
                >
                  <div
                    css={{
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    Select webhook*
                  </div>
                  <InlineA
                    href=""
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(
                        getWorkbenchWebhookTriggerCreateWebhookAbsPath(
                          workbenchId
                        ),
                        {
                          state: {
                            returnPath: `${location.pathname}${location.search}`,
                            draftState: formState,
                          },
                        }
                      )
                    }}
                    css={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Create new webhook
                  </InlineA>
                </Flex>
                <FormField hint="New webhooks added will appear in this list.">
                  <Select
                    selectedKey={formState.selectedWebhookKey || null}
                    leftContent={selectedWebhookIcon}
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
                      <ListBoxFooter key="create-webhook-footer">
                        <InlineA
                          href=""
                          onClick={(e) => {
                            e.preventDefault()
                            navigate(
                              getWorkbenchWebhookTriggerCreateWebhookAbsPath(
                                workbenchId
                              ),
                              {
                                state: {
                                  returnPath: `${location.pathname}${location.search}`,
                                  draftState: formState,
                                },
                              }
                            )
                          }}
                          css={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.small,
                          }}
                        >
                          <PlusIcon size={14} />
                          Create new webhook
                        </InlineA>
                      </ListBoxFooter>,
                    ]}
                  </Select>
                </FormField>
              </Flex>
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
                <FormField hint="Use a regex pattern to match against incoming event payloads. Supports syntax like ^alert\\.triggered$.">
                  <Input2
                    value={formState.regex}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        regex: e.target.value,
                      }))
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
                  onClick={() =>
                    navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
                  }
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
          </FormCardSC>
        )}
      </Flex>
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
