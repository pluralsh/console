import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { PROJECT_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../Settings'

import { ProjectsList } from './ProjectsList'
import ProjectCreate from './ProjectCreate'

export const PROJECT_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'projects', url: PROJECT_SETTINGS_ABS_PATH },
]

export default function ProjectSettings() {
  useSetBreadcrumbs(PROJECT_SETTINGS_BREADCRUMBS)

  return (
    <>
      <SettingsDescription>
        Manage clusters and permissions with projects
      </SettingsDescription>
      <PageToolbarPortal>
        <ProjectCreate small />
      </PageToolbarPortal>
      <ProjectsList />
    </>
  )
}
