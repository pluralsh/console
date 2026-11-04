import { Navigate, useSearchParams } from 'react-router-dom'

// GitHub app installs redirect here (via app.plural.sh) with an installation_id.
// Forward to Home, where the setup checklist finishes registering the app.
export function GitHubSetup() {
  const [params] = useSearchParams()
  const search = params.toString()

  return (
    <Navigate
      replace
      to={search ? `/home?${search}` : '/home'}
    />
  )
}
