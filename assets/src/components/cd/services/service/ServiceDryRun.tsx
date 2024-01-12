import { useNavigate } from 'react-router-dom'

import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useServiceContext } from './ServiceDetails'

export default function ServiceDryRun() {
  const navigate = useNavigate()
  const { service } = useServiceContext()
  const dryRun = true // TODO: Get that from service deployment.

  if (!service) {
    navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`)

    return null
  }
  if (!dryRun) {
    navigate(
      getServiceDetailsPath({
        serviceId: service.id,
        clusterId: service.cluster?.id,
      })
    )

    return null
  }

  return (
    <ScrollablePage
      heading="Dry run"
      scrollable={false}
    >
      ...
      {/* TODO: Content goes here. */}
    </ScrollablePage>
  )
}
