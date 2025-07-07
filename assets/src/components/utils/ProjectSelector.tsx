import {
  ListBoxItem,
  ProjectIcon,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useProjectsContext } from '../contexts/ProjectsContext'

export const AllProjectsOption = { id: 'all', name: 'All projects' }

export default function ProjectSelect({
  selectedProject,
  setSelectedProject,
  selectionValueType = 'id',
  allowSelectAll = false,
  ...props
}: {
  selectedProject: string
  setSelectedProject: (value: string) => void
  selectionValueType?: 'id' | 'name'
  allowSelectAll?: boolean
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const { colors } = useTheme()
  const { projects } = useProjectsContext()

  // can't just render the "all" listbox item conditionally because the Select children type is too restrictive
  // TODO: should fix this in DS at some point
  const options = [...projects, ...(allowSelectAll ? [AllProjectsOption] : [])]

  return (
    <Select
      selectionMode="single"
      titleContent={<ProjectIcon color={colors['icon-light']} />}
      label="Select project"
      onSelectionChange={(value) => setSelectedProject(value as string)}
      selectedKey={selectedProject}
      {...props}
    >
      {options.map((p) => (
        <ListBoxItem
          key={selectionValueType === 'id' ? p.id : p.name}
          label={p.name}
        />
      ))}
    </Select>
  )
}
