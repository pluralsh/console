import { useNavigate } from 'react-router-dom'
import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useMemo } from 'react'

import DiffViewer from '../../../utils/DiffViewer'

import { useServiceContext } from './ServiceDetails'

const SEPARATOR = '\n---\n'

export default function ServiceDesiredState() {
  const navigate = useNavigate()
  const { service } = useServiceContext()

  const [live, desired] = useMemo(
    () => [
      service?.components
        ?.map((c) => c?.content?.live ?? '')
        ?.join(SEPARATOR) ?? '',
      service?.components
        ?.map((c) => c?.content?.desired ?? '')
        ?.join(SEPARATOR) ?? '',
    ],
    [service]
  )

  if (!service) {
    navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`)

    return null
  }
  if (!service.dryRun) {
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
      heading="Desired state"
      scrollable
    >
      <DiffViewer
        oldValue={live}
        newValue={desired}
      />
    </ScrollablePage>
  )
}
