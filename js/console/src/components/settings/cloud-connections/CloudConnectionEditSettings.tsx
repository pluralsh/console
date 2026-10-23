import {
  Breadcrumb,
  Button,
  EmptyState,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { CloudConnectionCreateForm } from 'components/workbenches/tools/cloud-connection/CloudConnectionCreateForm'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { Provider, useCloudConnectionQuery } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CLOUD_CONNECTIONS_SETTINGS_ABS_PATH,
  CLOUD_CONNECTIONS_SETTINGS_CLOUD_CONNECTION_ID_PARAM_ID,
  getCloudConnectionsSettingsEditAbsPath,
} from 'routes/settingsRoutesConst'
import {
  getCloudConnectionSetupGuideDocumentationUrl,
  getCloudConnectionSetupGuideMarkdownPath,
} from '../../workbenches/tools/cloud-connection/cloudConnectionSetupGuides'
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'

export function CloudConnectionEditSettings() {
  const navigate = useNavigate()
  const params = useParams()
  const cloudConnectionId =
    params[CLOUD_CONNECTIONS_SETTINGS_CLOUD_CONNECTION_ID_PARAM_ID]
  const { data, loading, error } = useCloudConnectionQuery({
    variables: { id: cloudConnectionId ?? '' },
    skip: !cloudConnectionId,
    fetchPolicy: 'cache-and-network',
  })
  const connection = data?.cloudConnection
  const provider = connection?.provider ?? Provider.Aws
  const openedGuideForProvider = useRef<Nullable<Provider>>(null)
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const markdownPath = getCloudConnectionSetupGuideMarkdownPath(provider)
  const documentationUrl =
    getCloudConnectionSetupGuideDocumentationUrl(provider)
  const editPath = getCloudConnectionsSettingsEditAbsPath({
    cloudConnectionId,
  })

  useSetBreadcrumbs(
    useMemo<Breadcrumb[]>(
      () => [
        ...SETTINGS_BREADCRUMBS,
        {
          label: 'cloud connections',
          url: CLOUD_CONNECTIONS_SETTINGS_ABS_PATH,
        },
        { label: 'edit cloud connection', url: editPath },
      ],
      [editPath]
    )
  )

  const openGuide = useEffectEvent(() =>
    openSetupGuidePanel({
      documentationUrl,
      markdownPath,
    })
  )
  useEffect(() => {
    if (!connection || openedGuideForProvider.current === provider) return
    openedGuideForProvider.current = provider
    openGuide()
  }, [connection, provider])

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  return (
    <>
      <SettingsDescription>
        Edit cloud connection credentials and access policy.
      </SettingsDescription>
      {!isOpen && (
        <PageToolbarPortal>
          <Button
            secondary
            small
            startIcon={<SidePanelOpenIcon />}
            onClick={() =>
              openSetupGuidePanel({
                documentationUrl,
                markdownPath,
              })
            }
          >
            Setup guide
          </Button>
        </PageToolbarPortal>
      )}
      {error ? (
        <GqlError error={error} />
      ) : loading && !connection ? (
        <LoadingIndicator />
      ) : connection ? (
        <CloudConnectionCreateForm
          key={connection.id}
          existingConnection={connection}
          backPath={CLOUD_CONNECTIONS_SETTINGS_ABS_PATH}
          onSaved={() => navigate(CLOUD_CONNECTIONS_SETTINGS_ABS_PATH)}
          showSetupGuideButton={false}
        />
      ) : (
        <EmptyState message="Cloud connection not found.">
          <Button onClick={() => navigate(CLOUD_CONNECTIONS_SETTINGS_ABS_PATH)}>
            Back to all cloud connections
          </Button>
        </EmptyState>
      )}
    </>
  )
}
