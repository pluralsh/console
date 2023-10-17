import { LogsBase } from 'components/apps/app/logs/Logs'
import { useParams } from 'react-router-dom'

import { POD_PARAM_NAMESPACE } from '../../../../routes/cdRoutesConsts'

export default function PodLogs() {
  const params = useParams()
  const namespace = params[POD_PARAM_NAMESPACE] as string

  if (!namespace) {
    return null
  }

  return <LogsBase namespace={namespace} />
}
