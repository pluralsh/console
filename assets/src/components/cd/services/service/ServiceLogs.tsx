import { Logs } from 'components/cd/logs/Logs'
import { useParams } from 'react-router-dom'
import { SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'

export default function ServiceLogs() {
  const serviceId = useParams()[SERVICE_PARAM_ID]

  return <Logs serviceId={serviceId} />
}
