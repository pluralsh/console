import {
  CheckRoundedIcon,
  ListBoxFooter,
  ListBoxItem,
  ProjectIcon,
  Select,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { useProjectsContext } from '../contexts/ProjectsContext'

export default function ProjectSelect() {
  const theme = useTheme()
  const { projects, projectId, setProjectId } = useProjectsContext()

  return (
    <div css={{ width: 280, marginLeft: theme.spacing.large }}>
      <Select
        transparent
        aria-label="project"
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
        label="All projects"
        size="small"
        onSelectionChange={(id) => setProjectId(id as string)}
        selectedKey={projectId}
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
      </Select>
    </div>
  )
}
