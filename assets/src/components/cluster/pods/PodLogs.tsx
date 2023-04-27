import { LogsBase } from 'components/apps/app/logs/Logs'
import { useParams } from 'react-router-dom'

export default function PodLogs() {
  const { namespace } = useParams()

  if (!namespace) {
    return null
  }

  return <LogsBase namespace={namespace} />
}
