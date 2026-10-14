import { ListBoxItem, Toast } from '@pluralsh/design-system'

import { useProjectsTinyQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql'
import { useSelectedProjectContext } from '../contexts/ProjectsContext'
import { CrumbSelect } from './CrumbSelect'

const ALL_PROJECTS_KEY = '__all__'

export function HeaderProjectSelect() {
  const { projectId, setProjectId } = useSelectedProjectContext()

  const { data, error } = useProjectsTinyQuery({
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const projects = useMemo(
    () => mapExistingNodes(data?.projects),
    [data?.projects]
  )
  const selected = projects.find(({ id }) => id === projectId)

  return (
    <>
      <CrumbSelect
        ariaLabel="Project"
        label={selected?.name ?? 'all projects'}
        selectedKey={projectId || ALL_PROJECTS_KEY}
        onSelectionChange={(key) =>
          setProjectId(key === ALL_PROJECTS_KEY ? '' : key)
        }
      >
        {[
          <ListBoxItem
            key={ALL_PROJECTS_KEY}
            label="all projects"
            textValue="all projects"
          />,
          ...projects.map((p) => (
            <ListBoxItem
              key={p.id}
              label={p.name}
              textValue={p.name}
              description={p.description}
            />
          )),
        ]}
      </CrumbSelect>
      {error && (
        <Toast
          heading="Error loading projects"
          severity="danger"
          position="bottom"
          closeTimeout={5000}
          margin="large"
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}
