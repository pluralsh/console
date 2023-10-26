import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { getGlobalSettingsBreadcrumbs } from 'components/cd/clusters/GlobalSettings'
import { useMemo } from 'react'

export function GlobalSettingsRepositories() {
  useSetBreadcrumbs(
    useMemo(() => getGlobalSettingsBreadcrumbs({ page: 'repositories' }), [])
  )

  return <div> Repositories</div>
}
