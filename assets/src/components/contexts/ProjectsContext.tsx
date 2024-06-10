import { ReactElement, createContext, useContext, useMemo } from 'react'

import { ProjectFragment, useProjectsTinyQuery } from '../../generated/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
import ShowAfterDelay from '../utils/ShowAfterDelay'
import { mapExistingNodes } from '../../utils/graphql'

interface ProjectsContextT {
  projects: ProjectFragment[]
  project: ProjectFragment
}

const ProjectsContext = createContext<ProjectsContextT | undefined | null>(null)

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext)

  if (!ctx) {
    throw Error('useProjectsContext() must be used within a ProjectsContext')
  }

  return ctx
}

export function useProjects() {
  const { projects } = useProjectsContext()

  return projects
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

  const context = useMemo(() => ({ projects }) as ProjectsContextT, [projects])

  // TODO: How to persist currently selected project?
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
