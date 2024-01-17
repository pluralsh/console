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
const NEW_LINE_REGEXP = /^\s+|\s+$/g

export default function ServiceDesiredState() {
  const navigate = useNavigate()
  const { service } = useServiceContext()

  const [live, desired] = useMemo(
    () => [
      service?.components
        ?.map((c) => c?.content?.live?.replace(NEW_LINE_REGEXP, '') ?? '')
        ?.join(SEPARATOR) ?? '',
      service?.components
        ?.map((c) => c?.content?.desired?.replace(NEW_LINE_REGEXP, '') ?? '')
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
      scrollable={false}
    >
      <DiffViewer
        oldValue={live}
        newValue={desired}
      />
    </ScrollablePage>
  )
}
