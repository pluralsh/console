import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet } from 'react-router-dom'

export default function Backups() {
  // useSetBreadcrumbs(breadcrumbs)

  return (
    <ResponsivePageFullWidth
      heading="Backups"
      scrollable={false}
    >
      <Outlet />
    </ResponsivePageFullWidth>
  )
}
