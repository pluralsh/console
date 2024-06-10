import {
  Dispatch,
  ReactElement,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ApolloError } from '@apollo/client'
import { Banner } from '@pluralsh/design-system'

import { ProjectFragment, useProjectsTinyQuery } from '../../generated/graphql'
import LoadingIndicator from '../utils/LoadingIndicator'
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

export function useProjectId() {
  const { projectId } = useProjectsContext()

  return projectId
}

export function ProjectsProvider({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  const [error, setError] = useState<ApolloError>()

  const { data, loading } = useProjectsTinyQuery({
    pollInterval: 60_000,
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 5000)
    },
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

  if (loading) return <LoadingIndicator />

  return (
    <ProjectsContext.Provider value={context}>
      {children}
      {error && (
        <Banner
          heading="Failed to fetch projects"
          severity="error"
          position="fixed"
          bottom={24}
          right={100}
          zIndex={1000}
          onClose={() => setError(undefined)}
        >
          {error.message}
        </Banner>
      )}
    </ProjectsContext.Provider>
  )
}
