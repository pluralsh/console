import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'

type SelectedProjectContextT = {
  projectId: string
  setProjectId: Dispatch<SetStateAction<string>>
}

const SelectedProjectContext =
  createContext<Nullable<SelectedProjectContextT>>(null)

export function useSelectedProjectContext() {
  const ctx = useContext(SelectedProjectContext)

  if (!ctx)
    throw Error('useProjectsContext() must be used within a ProjectsContext')

  return ctx
}

export function useProjectId() {
  const { projectId } = useSelectedProjectContext()

  return projectId || undefined // Need to use undefined instead of empty string in queries.
}

export function SelectedProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState('')

  const context: SelectedProjectContextT = useMemo(
    () => ({ projectId, setProjectId }),
    [projectId, setProjectId]
  )

  return (
    <SelectedProjectContext value={context}>{children}</SelectedProjectContext>
  )
}
