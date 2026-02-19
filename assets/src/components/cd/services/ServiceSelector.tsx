import { ListBoxItem, Select } from '@pluralsh/design-system'
import {
  useFlowServicesQuery,
  useServiceDeploymentsTinyQuery,
  useServiceDeploymentTinySuspenseQuery,
} from 'generated/graphql'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
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

export function ServiceSelector() {
  const theme = useTheme()
  const navigate = useNavigate()

  const { serviceId } = useParams()
  const { flowIdOrName, flowData } = useCurrentFlow()
  const referrer = !!flowIdOrName ? 'flow' : 'cd'

  const { data: serviceTiny } = useServiceDeploymentTinySuspenseQuery({
    variables: { id: serviceId ?? '' },
  })

  const { data: clusterServices } = useServiceDeploymentsTinyQuery({
    variables: { clusterId: serviceTiny.serviceDeployment?.cluster?.id ?? '' },
    skip: referrer !== 'cd',
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const flowId = flowData?.flow?.id
  const { data: flowServices } = useFlowServicesQuery({
    variables: { id: flowId ?? '' },
    skip: referrer !== 'flow' || !flowId,
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
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
    (newKey: Nullable<Key>) => {
      if (typeof newKey === 'string' && newKey !== serviceId) {
        const service = serviceList.find(
          (deployment) => deployment.id === newKey
        )
        navigate(
          `${getServiceDetailsPath({
            flowIdOrName,
            clusterId: service?.cluster?.id,
            serviceId: service?.id,
          })}/${urlSuffix}`
        )
      }
    },
    [flowIdOrName, navigate, serviceId, serviceList, urlSuffix]
  )

  return (
    <Select
      aria-label="app"
      selectedKey={serviceId}
      onSelectionChange={switchService}
      label="Select a service"
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
