import { ListBoxItem, Select } from '@pluralsh/design-system'
import {
  ServiceDeploymentDetailsFragment,
  useFlowServicesQuery,
  useServiceDeploymentsTinyQuery,
} from 'generated/graphql'
import { Key, useCallback, useMemo } from 'react'
import { useMatch, useNavigate, useParams } from 'react-router-dom'
import {
  CD_SERVICE_PATH_MATCHER_ABS,
  FLOW_SERVICE_PATH_MATCHER_ABS,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { POLL_INTERVAL } from '../ContinuousDeployment'

export function ServiceSelector({
  currentService,
}: {
  currentService: Nullable<ServiceDeploymentDetailsFragment>
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  const { flowId } = useParams()
  const referrer = !!flowId ? 'flow' : 'cd'

  const { data: clusterServices } = useServiceDeploymentsTinyQuery({
    variables: { clusterId: currentService?.cluster?.id },
    skip: !currentService?.cluster?.id || referrer !== 'cd',
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const { data: flowServices } = useFlowServicesQuery({
    variables: { id: flowId ?? '' },
    skip: referrer !== 'flow',
  })

  const serviceList = useMemo(
    () =>
      mapExistingNodes(
        referrer === 'cd'
          ? clusterServices?.serviceDeployments
          : flowServices?.flow?.services
      ),
    [
      clusterServices?.serviceDeployments,
      flowServices?.flow?.services,
      referrer,
    ]
  )

  const urlSuffix =
    useMatch(
      `/${referrer === 'cd' ? CD_SERVICE_PATH_MATCHER_ABS : FLOW_SERVICE_PATH_MATCHER_ABS}/*`
    )?.params['*'] ?? ''

  const switchService = useCallback(
    (newKey: Key) => {
      if (typeof newKey === 'string' && newKey !== currentService?.id) {
        const service = serviceList.find(
          (deployment) => deployment.id === newKey
        )
        navigate(
          `${getServiceDetailsPath({
            flowId,
            clusterId: service?.cluster?.id,
            serviceId: service?.id,
          })}/${urlSuffix}`
        )
      }
    },
    [currentService?.id, flowId, navigate, serviceList, urlSuffix]
  )

  return (
    <Select
      aria-label="app"
      selectedKey={currentService?.id}
      onSelectionChange={switchService}
    >
      {serviceList.map((service) => (
        <ListBoxItem
          key={service.id}
          label={
            <>
              {service.name}{' '}
              <span
                css={{
                  ...theme.partials.text.caption,
                  color: theme.colors['text-xlight'],
                }}
              >
                ({service.cluster?.name})
              </span>
            </>
          }
          textValue={`${service.name} (${service.cluster?.name})`}
        />
      ))}
    </Select>
  )
}
