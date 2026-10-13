import { Button, Code, Divider, Flex, Switch } from '@pluralsh/design-system'
import { InsightDisplay } from 'components/ai/insights/InsightDisplay.tsx'
import { SendInsightToWorkbenchButton } from 'components/ai/insights/SendInsightToWorkbench'
import { GqlError } from 'components/utils/Alert.tsx'
import IconFrameRefreshButton from 'components/utils/RefreshIconFrame.tsx'
import {
  useClusterInsightComponentQuery,
  useServiceComponentIdentitiesQuery,
} from 'generated/graphql.ts'
import { useMemo, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import {
  CLUSTER_ABS_PATH,
  CLUSTER_INSIGHTS_PATH,
  getServiceComponentPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts.tsx'
import { useTheme } from 'styled-components'
import { stringify } from 'yaml'
import {
  useClusterInsightsContext,
  useSetActionContent,
  useSetNavigationContent,
} from './ClusterInsights.tsx'
import {
  ClusterInsightComponentLabel,
  isSameObject,
} from './ClusterInsightComponentParts.tsx'

export function ClusterInsightComponent() {
  const theme = useTheme()
  const { clusterLoading, refetch } = useClusterInsightsContext()
  const id =
    useMatch(`${CLUSTER_ABS_PATH}/${CLUSTER_INSIGHTS_PATH}/components/:id`)
      ?.params?.id || ''
  const { data, loading, error } = useClusterInsightComponentQuery({
    variables: { id },
  })

  const component = data?.clusterInsightComponent
  const [showRaw, setShowRaw] = useState(false)

  // Goes to the component of the managing service that is this object, which has the insight with the context of the
  // service, and to the service itself when it does not have that component in its manifests.
  const service = component?.service
  const { data: serviceData } = useServiceComponentIdentitiesQuery({
    skip: !service,
    variables: { id: service?.id ?? '' },
  })
  const serviceComponentId = component
    ? serviceData?.serviceDeployment?.components?.find(
        (c) => c && isSameObject(c, component)
      )?.id
    : undefined
  const serviceLink = useMemo(() => {
    if (!service) return null

    const clusterId = service.cluster?.id

    return serviceComponentId
      ? {
          label: 'View Service Component',
          to: `${getServiceComponentPath({
            clusterId,
            serviceId: service.id,
            componentId: serviceComponentId,
          })}/insights`,
        }
      : {
          label: 'View Service',
          to: getServiceDetailsPath({ clusterId, serviceId: service.id }),
        }
  }, [service, serviceComponentId])

  useSetNavigationContent(
    useMemo(
      () => (
        <ClusterInsightComponentLabel
          component={component}
          loading={!data && (loading || clusterLoading)}
        />
      ),
      [component, data, loading, clusterLoading]
    )
  )

  useSetActionContent(
    useMemo(
      () => (
        <Flex
          gap="small"
          align="center"
        >
          <Switch
            checked={showRaw}
            onChange={(checked) => setShowRaw(checked)}
          >
            Raw
          </Switch>
          <IconFrameRefreshButton
            loading={clusterLoading}
            refetch={refetch}
          />
          {serviceLink && (
            <Button
              secondary
              as={Link}
              to={serviceLink.to}
            >
              {serviceLink.label}
            </Button>
          )}
          <SendInsightToWorkbenchButton insight={component?.insight} />
        </Flex>
      ),
      [showRaw, clusterLoading, refetch, component?.insight, serviceLink]
    )
  )

  if (error)
    return (
      <GqlError
        error={error}
        header="Error loading insight component"
      />
    )

  return (
    <>
      <Divider backgroundColor={theme.colors.border} />
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          height: '100%',
          minHeight: 0,
          width: '100%',

          ...(showRaw
            ? {
                '> div': {
                  width: '50%',
                },
              }
            : {}),
        }}
      >
        <InsightDisplay
          insight={component?.insight}
          kind={component?.kind}
          loading={loading}
        />
        {showRaw && (
          <Code language="yaml">{stringify(component?.resource?.raw)}</Code>
        )}
      </div>
    </>
  )
}
