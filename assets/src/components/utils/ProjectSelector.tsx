import {
  ListBoxItem,
  ProjectIcon,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useProjectsContext } from '../contexts/ProjectsContext'

export default function ProjectSelect({
  selectedProject,
  setSelectedProject,
  selectionValueType = 'id',
  ...props
}: {
  selectedProject: string
  setSelectedProject: (value: string) => void
  selectionValueType?: 'id' | 'name'
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const theme = useTheme()
  const { projects } = useProjectsContext()

  return (
    <Select
      titleContent={<ProjectIcon color={theme.colors['icon-light']} />}
      label="Select project"
      onSelectionChange={(value) => setSelectedProject(value as string)}
      selectedKey={selectedProject}
      {...props}
    >
      {projects.map((p) => (
        <ListBoxItem
          key={selectionValueType === 'id' ? p.id : p.name}
          label={p.name}
        />
      ))}
    </Select>
  )
}
