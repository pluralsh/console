import {
  Button,
  Flex,
  FormField,
  GitHubLogoIcon,
  GitLabLogoIcon,
  Input2,
  ListBoxItem,
  ReturnIcon,
  Select,
  TicketIcon,
  VisualInspectionIcon,
  WebhooksIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
  useCreateIssueWebhookMutation,
  useIssueWebhooksQuery,
  useObservabilityWebhooksQuery,
  useUpsertObservabilityWebhookMutation,
  useWorkbenchQuery,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import queryString from 'query-string'
import { useState, useMemo } from 'react'
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
import { WebhookTriggerFormState } from './WorkbenchWebhookTriggerForm'
import { getObservabilityWebhookTypeIcon } from '../../../settings/global/observability/EditObservabilityWebhook'

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

type RouteState = {
  returnPath?: string
  draftState?: WebhookTriggerFormState
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

export function WorkbenchWebhookTriggerCreateWebhook() {
  const navigate = useNavigate()
  const location = useLocation()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const routeState = location.state as Nullable<RouteState>
  const listPath = getWorkbenchWebhookTriggersAbsPath(workbenchId)
  const returnPath = routeState?.returnPath ?? listPath

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const {
    refetch: refetchObservabilityWebhooks,
    error: observabilityWebhooksError,
  } = useObservabilityWebhooksQuery({ variables: { first: 100 } })

  const { refetch: refetchIssueWebhooks, error: issueWebhooksError } =
    useIssueWebhooksQuery({ variables: { first: 100 } })

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

  const error =
    workbenchError ?? observabilityWebhooksError ?? issueWebhooksError

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
        {!workbenchData && workbenchLoading ? (
          <RectangleSkeleton
            $width="100%"
            $height="100%"
          />
        ) : (
          <FormCardSC>
            <CreateWebhookForm
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
              refetchObservabilityWebhooks={() =>
                refetchObservabilityWebhooks()
              }
              refetchIssueWebhooks={() => refetchIssueWebhooks()}
            />
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}

function CreateWebhookForm({
  onReturn,
  returnPathIsList,
  onCreated,
  refetchObservabilityWebhooks,
  refetchIssueWebhooks,
}: {
  onReturn: () => void
  returnPathIsList?: boolean
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
