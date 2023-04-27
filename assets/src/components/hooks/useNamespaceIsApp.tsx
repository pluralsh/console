import { useContext, useMemo } from 'react'
import { InstallationContext } from 'components/Installations'

export const useNamespaceIsApp = (namespace = '') => {
  const { applications } = useContext<any>(InstallationContext) as {
    applications?: { name?: string }[]
  }

  return useMemo(
    () => !!(namespace && applications?.some((app) => app?.name === namespace)),
    [applications, namespace]
  )
}
