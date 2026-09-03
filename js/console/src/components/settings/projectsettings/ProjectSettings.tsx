import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { PROJECT_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'

import { useTheme } from 'styled-components'

import { StackedTextSC } from 'components/utils/table/StackedText'

import { SETTINGS_BREADCRUMBS } from '../Settings'

import { ProjectsList } from './ProjectsList'
import ProjectCreate from './ProjectCreate'

export const PROJECT_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'projects', url: PROJECT_SETTINGS_ABS_PATH },
]

export default function ProjectSettings() {
  const theme = useTheme()

  useSetBreadcrumbs(PROJECT_SETTINGS_BREADCRUMBS)
  useSetPageHeaderContent(
    <div
      css={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.large,
      }}
    >
      <StackedTextSC>
        <span css={{ ...theme.partials.text.subtitle1 }}>Projects</span>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          Manage clusters and permissions with projects
        </span>
      </StackedTextSC>
      <ProjectCreate />
    </div>
  )

  return <ProjectsList />
}
