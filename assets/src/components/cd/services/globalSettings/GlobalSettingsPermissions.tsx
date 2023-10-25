import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { getGlobalSettingsBreadcrumbs } from 'components/cd/clusters/GlobalSettings'
import { useMemo } from 'react'

export function GlobalSettingsPermissions() {
  useSetBreadcrumbs(
    useMemo(() => getGlobalSettingsBreadcrumbs({ page: 'permissions' }), [])
  )

  return <div> Permissions</div>
}
