import {
  Button,
  EmptyState,
  Flex,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useGetWorkbenchWebhookMutation,
  useWorkbenchQuery,
} from 'generated/graphql'
import { useEffect, useMemo } from 'react'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchWebhookTriggerCreateWebhookAbsPath,
  getWorkbenchWebhookTriggersAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM,
  WORKBENCHES_WEBHOOK_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import {
  WorkbenchWebhookTriggerForm,
  WebhookTriggerFormState,
} from './WorkbenchWebhookTriggerForm'

type RouteState = {
  draftState?: WebhookTriggerFormState
}

export function WorkbenchWebhookTriggerCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const webhookId = useParams()[WORKBENCHES_WEBHOOK_PARAM_ID]
  const routeState = location.state as Nullable<RouteState>
  const selectedWebhookKey =
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
      <EmptyState message="Webhook trigger not found.">
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
            $height="100%"
          />
        ) : (
          <FormCardSC>
            <WorkbenchWebhookTriggerForm
              key={`${mode}-${webhook?.id ?? 'new'}-${selectedWebhookKey ?? ''}`}
              workbenchId={workbenchId}
              webhook={webhook}
              initialFormState={routeState?.draftState}
              selectedWebhookKey={selectedWebhookKey}
              onCreateWebhook={(nextDraftState) => {
                navigate(
                  getWorkbenchWebhookTriggerCreateWebhookAbsPath(workbenchId),
                  {
                    state: {
                      returnPath: `${location.pathname}${location.search}`,
                      draftState: nextDraftState,
                    },
                  }
                )
              }}
              onCancel={() =>
                navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
              }
              onCompleted={() =>
                navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
              }
            />
          </FormCardSC>
        )}
      </Flex>
    </Flex>
  )
}
