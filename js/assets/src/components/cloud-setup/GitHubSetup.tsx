import { useCloudSetupUnfinished } from 'components/contexts'
import { Navigate } from 'react-router-dom'

export function GitHubSetup() {
  const isCloudSetupUnfinished = useCloudSetupUnfinished()

  if (!isCloudSetupUnfinished) return <Navigate to="/" />

  return null
}
