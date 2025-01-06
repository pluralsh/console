import {
  Dispatch,
  ReactElement,
  ReactNode,
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

interface ProjectsContextT {
  projects: ProjectFragment[]
  project: ProjectFragment
  projectId: string
  setProjectId: Dispatch<SetStateAction<string>>
}

const ProjectsContext = createContext<ProjectsContextT | undefined | null>(null)

export function useProjectsContext() {
  const ctx = useContext(ProjectsContext)

  if (!ctx) {
    throw Error('useProjectsContext() must be used within a ProjectsContext')
  }

  return ctx
}

export function useProjectId() {
  const { projectId } = useProjectsContext()

  return projectId || undefined // Need to use undefined instead of empty string in queries.
}

export function ProjectsProvider({
  children,
}: {
  children: ReactNode
}): ReactElement<any> {
  const [error, setError] = useState<ApolloError>()

  const { data, loading } = useProjectsTinyQuery({
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 5000)
    },
  })

  const projects = useMemo(
    () => mapExistingNodes(data?.projects),
    [data?.projects]
  )

  const [projectId, setProjectId] = useState('') // usePersistedState('plural-project-id', '')

  const project = useMemo(
    () => projects.find(({ id }) => id === projectId),
    [projects, projectId]
  )

  const context = useMemo(
    () =>
      ({
        projects,
        project,
        projectId,
        setProjectId,
      }) as ProjectsContextT,
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
