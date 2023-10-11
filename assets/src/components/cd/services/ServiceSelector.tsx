import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Key, useCallback } from 'react'
import { ServiceDeployment } from 'generated/graphql'
import {
  SERVICE_BASE_PATH,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_NAME,
  getServiceDetailsPath,
} from 'routes/cdRoutes'
import { useMatch, useNavigate } from 'react-router-dom'

export default function ServiceSelector({
  serviceDeployments,
}: {
  serviceDeployments: Pick<ServiceDeployment, 'id' | 'name' | 'cluster'>[]
}) {
  const navigate = useNavigate()
  const pathMatch = useMatch(`/${SERVICE_BASE_PATH}*`)
  const urlSuffix = pathMatch?.params['*'] ? `/${pathMatch?.params['*']}` : ''
  const currentServiceName = pathMatch?.params[SERVICE_PARAM_NAME]
  const currentClusterName = pathMatch?.params[SERVICE_PARAM_CLUSTER]
  const selectedKey = `${currentClusterName}/${currentServiceName}`

  const switchService = useCallback(
    (newKey: Key) => {
      if (typeof newKey === 'string' && newKey !== selectedKey) {
        console.log('newKey', newKey)
        const [clusterName, serviceName] = newKey.split('/')

        console.log({ clusterName, serviceName })

        navigate(
          `${getServiceDetailsPath({ clusterName, serviceName })}${urlSuffix}`
        )
      }
    },
    [navigate, selectedKey, urlSuffix]
  )

  return (
    <Select
      aria-label="app"
      selectedKey={selectedKey}
      onSelectionChange={switchService}
    >
      {serviceDeployments.map((serviceDeployment) => (
        <ListBoxItem
          key={`${serviceDeployment?.cluster?.name}/${serviceDeployment.name}`}
          label={serviceDeployment.name}
          textValue={serviceDeployment.name}
        />
      ))}
    </Select>
  )
}
