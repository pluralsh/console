import { useLocation } from 'react-router-dom'

export default function PipelineJobLogs() {
  const { pathname } = useLocation()

  return <div>{pathname}</div>
}
