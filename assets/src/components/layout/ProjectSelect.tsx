import { ListBoxFooter, ListBoxItem, Select } from '@pluralsh/design-system'

import { useProjectsContext } from '../contexts/ProjectsContext'

export default function ProjectSelect() {
  const { projects, projectId, setProjectId } = useProjectsContext()

  return (
    <div css={{ width: 280 }}>
      <Select
        aria-label="project"
        dropdownFooterFixed={
          <ListBoxFooter onClick={() => setProjectId('')}>
            All projects
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
          />
        ))}
      </Select>
    </div>
  )
}
