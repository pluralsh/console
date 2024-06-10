import {
  Dispatch,
  ReactElement,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
} from 'react'

import { ProjectFragment, useProjectsTinyQuery } from '../../generated/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
import ShowAfterDelay from '../utils/ShowAfterDelay'
import { mapExistingNodes } from '../../utils/graphql'
import usePersistedState from '../hooks/usePersistedState'

interface ProjectsContextT {
  projects: ProjectFragment[]
  project: ProjectFragment
  projectId: string
  setProjectId: Dispatch<SetStateAction<string>>
}

const localStorageId = 'plural-project-id'

const ProjectsContext = createContext<ProjectsContextT | undefined | null>(null)

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext)

  if (!ctx) {
    throw Error('useProjectsContext() must be used within a ProjectsContext')
  }

  return ctx
}

export function useProject() {
  const { project } = useProjectsContext()

  return project
}

export function ProjectsProvider({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  const { data, loading } = useProjectsTinyQuery({
    pollInterval: 60_000,
  })

  const projects = useMemo(
    () => mapExistingNodes(data?.projects),
    [data?.projects]
  )

  const [projectId, setProjectId] = usePersistedState(localStorageId, '')

  const project = useMemo(
    () => projects.find(({ id }) => id === projectId),
    [projects, projectId]
  )

  const context = useMemo(
    () => ({ projects, project, projectId, setProjectId }) as ProjectsContextT,
    [projects, project, projectId, setProjectId]
  )

  // TODO: Error handling.
  // TODO: What to do during loading?
  if (loading) {
    return (
      <ShowAfterDelay>
        <LoadingIndicator />
      </ShowAfterDelay>
    )
  }

  return (
    <ProjectsContext.Provider value={context}>
      {children}
    </ProjectsContext.Provider>
  )
}
