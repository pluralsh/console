import {
  CheckRoundedIcon,
  ComboBox,
  ListBoxFooter,
  ListBoxItem,
  ProjectIcon,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { useProjectsContext } from '../contexts/ProjectsContext'

export default function ProjectSelect() {
  const theme = useTheme()
  const { projects, projectId, setProjectId } = useProjectsContext()

  return (
    <div
      css={{
        width: 280,
        borderRadius: theme.borderRadiuses.medium,
        marginLeft: theme.spacing.large,
      }}
      style={{ border: projectId ? theme.borders['outline-focused'] : 'none' }}
    >
      <ComboBox
        aria-label="project"
        label="Project"
        selectedKey={projectId}
        onSelectionChange={(id) => setProjectId(id as string)}
        titleContent={<ProjectIcon color={theme.colors['icon-light']} />}
        dropdownFooterFixed={
          <ListBoxFooter
            onClick={() => setProjectId('')}
            leftContent={<CheckRoundedIcon color="icon-info" />}
          >
            <span css={{ color: theme.colors['text-primary-accent'] }}>
              Select all projects
            </span>
          </ListBoxFooter>
        }
      >
        {projects.map((p) => (
          <ListBoxItem
            key={p.id}
            label={p.name}
            textValue={p.name}
            description={p.description}
            selected={isEmpty(projectId)} // Show checkboxes next to all projects if that option is selected.
          />
        ))}
      </ComboBox>
    </div>
  )
}
