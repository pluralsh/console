import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Key, useCallback } from 'react'
import { ServiceDeployment } from 'generated/graphql'
import {
  SERVICE_BASE_PATH,
  SERVICE_PARAM_ID,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { useMatch, useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

export default function ServiceSelector({
  serviceDeployments,
}: {
  serviceDeployments: Pick<ServiceDeployment, 'id' | 'name' | 'cluster'>[]
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const pathMatch = useMatch(`/${SERVICE_BASE_PATH}*`)
  const urlSuffix = pathMatch?.params['*'] ? `/${pathMatch?.params['*']}` : ''
  const currentServiceId = pathMatch?.params[SERVICE_PARAM_ID]
  const selectedKey = currentServiceId

  const switchService = useCallback(
    (newKey: Key) => {
      if (typeof newKey === 'string' && newKey !== selectedKey) {
        const service = serviceDeployments.find(
          (deployment) => deployment.id === newKey
        )

        navigate(
          `${getServiceDetailsPath({
            clusterName: service?.cluster?.name,
            serviceId: service?.id,
          })}${urlSuffix}`
        )
      }
    },
    [navigate, selectedKey, serviceDeployments, urlSuffix]
  )

  return (
    <Select
      aria-label="app"
      selectedKey={currentServiceId}
      onSelectionChange={switchService}
    >
      {serviceDeployments.map((serviceDeployment) => (
        <ListBoxItem
          key={serviceDeployment.id}
          label={
            <>
              {serviceDeployment.name}{' '}
              <span
                css={{
                  ...theme.partials.text.caption,
                  color: theme.colors['text-xlight'],
                }}
              >
                ({serviceDeployment.cluster?.name})
              </span>
            </>
          }
          textValue={`${serviceDeployment.name} (${serviceDeployment.cluster?.name})`}
        />
      ))}
    </Select>
  )
}
