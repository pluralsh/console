import { Suspense, useMemo } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'

import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { ToolbarTabs } from '../../layout/PageToolbar'
import LoadingIndicator from '../../utils/LoadingIndicator'

export type CategoryDirectory = ReadonlyArray<{ path: string; label: string }>

// a resource category whose tabs keep the current search params, so the
// namespace filter carries over between resource kinds
export function ResourceCategory({
  basePath,
  directory,
}: {
  basePath: string
  directory: CategoryDirectory
}) {
  const { search } = useLocation()
  const tab = useMatch(`${basePath}/:tab/*`)?.params?.tab ?? ''

  const headerContent = useMemo(
    () => (
      <ToolbarTabs
        directory={directory.map(({ path, label }) => ({
          label,
          path: `${basePath}/${path}${search}`,
        }))}
        activeFn={(path) => path === `${basePath}/${tab}${search}`}
      />
    ),
    [basePath, directory, search, tab]
  )

  useSetPageHeaderContent(headerContent)

  return (
    <PluralErrorBoundary>
      <Suspense fallback={<LoadingIndicator />}>
        <Outlet />
      </Suspense>
    </PluralErrorBoundary>
  )
}
