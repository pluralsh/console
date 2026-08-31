import {
  Button,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchQuery } from 'generated/graphql'
import queryString from 'query-string'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchWebhookTriggersAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'

import { getWorkbenchBreadcrumbs } from '../Workbench'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'
import { WebhookTriggerFormState } from './WebhookTriggerForm'
import {
  getSetupGuideDocumentationUrl,
  getSetupGuideMarkdownPath,
} from 'components/settings/webhooks/webhookCreateFormSetupGuides'
import { WebhookCreateForm } from 'components/settings/webhooks/WebhookCreateForm'
import { SetupGuideSelection } from 'components/settings/webhooks/WebhookCreateFormTypes'
import { useWebhookSetupGuidePanel } from './WebhookSetupGuidePanel'

type RouteState = {
  returnPath?: string
  draftState?: WebhookTriggerFormState
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

export function WebhookForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const routeState = location.state as Nullable<RouteState>
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const [setupGuideSelection, setSetupGuideSelection] =
    useState<SetupGuideSelection>({
      webhookType: 'observability',
      observabilityType: null,
      issueProvider: null,
    })
  const setupGuideMarkdownPath = getSetupGuideMarkdownPath(setupGuideSelection)
  const setupGuideDocumentationUrl =
    getSetupGuideDocumentationUrl(setupGuideSelection)
  const listPath = getWorkbenchWebhookTriggersAbsPath(workbenchId)
  const returnPath = routeState?.returnPath ?? listPath

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

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

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  useEffect(() => {
    if (!isOpen) return
    if (!setupGuideMarkdownPath) {
      closeSetupGuidePanel()
      return
    }

    openSetupGuidePanel({
      documentationUrl: setupGuideDocumentationUrl,
      markdownPath: setupGuideMarkdownPath,
    })
  }, [
    isOpen,
    setupGuideMarkdownPath,
    setupGuideDocumentationUrl,
    openSetupGuidePanel,
    closeSetupGuidePanel,
  ])

  if (workbenchError) return <GqlError error={workbenchError} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        direction="column"
        gap="large"
        width="100%"
        css={{ maxWidth: 750, marginInline: 'auto' }}
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
        <Flex gap="medium">
          <Flex
            direction="column"
            width="100%"
          >
            {!workbenchData && workbenchLoading ? (
              <RectangleSkeleton
                $width="100%"
                $height={300}
              />
            ) : (
              <FormCardSC>
                <WebhookCreateForm
                  onGuideSelectionChange={setSetupGuideSelection}
                  onReturn={() =>
                    navigate(returnPath, {
                      state: { draftState: routeState?.draftState },
                    })
                  }
                  refetchQueries={[
                    'WorkbenchWebhooks',
                    'WorkbenchTriggersSummary',
                  ]}
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
                />
              </FormCardSC>
            )}
          </Flex>
          {!isOpen && !!setupGuideMarkdownPath && (
            <div css={{ width: 200 }}>
              <Button
                secondary
                startIcon={<SidePanelOpenIcon />}
                onClick={() =>
                  openSetupGuidePanel({
                    documentationUrl: setupGuideDocumentationUrl,
                    markdownPath: setupGuideMarkdownPath,
                  })
                }
                width="100%"
                css={{ whiteSpace: 'nowrap' }}
              >
                Setup Guide
              </Button>
            </div>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
