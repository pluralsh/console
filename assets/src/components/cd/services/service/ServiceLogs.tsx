import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { Logs } from 'components/cd/logs/Logs'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CD_REL_PATH } from 'routes/cdRoutesConsts'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'
import styled from 'styled-components'

export default function ServiceLogs() {
  const { service } = useServiceContext()
  const { serviceId, clusterId } = useParams()

  const breadcrumbs = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'logs',
        url: `${CD_REL_PATH}/services/${serviceId}/logs`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <WrapperSC>
      <Logs
        serviceId={serviceId}
        showLegendTooltip={false}
      />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  paddingBottom: theme.spacing.medium,
}))
