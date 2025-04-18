import { Outlet } from 'react-router-dom'
import { useServiceContext } from '../ServiceDetails'

export function ServiceSettings() {
  const ctx = useServiceContext()
  return (
    <div>
      service settings
      <Outlet context={ctx} />
    </div>
  )
}
