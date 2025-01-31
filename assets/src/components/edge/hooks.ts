import { useMemo } from 'react'
import { useMatch } from 'react-router-dom'
import {
  EDGE_ABS_PATH,
  EDGE_CLUSTERS_REL_PATH,
  EDGE_IMAGES_REL_PATH,
} from '../../routes/edgeRoutes.tsx'

function useDirectory({ filtered = true }: { filtered?: boolean } = {}) {
  const currentRelPath = useCurrentTab()

  return useMemo(() => {
    const directory = [
      {
        path: EDGE_CLUSTERS_REL_PATH,
        label: 'Cluster Registrations',
        enabled: true,
      },
      {
        path: EDGE_IMAGES_REL_PATH,
        label: 'Images',
        enabled: false,
      },
    ]

    if (!filtered) {
      return directory
    }

    return directory.filter(
      ({ enabled, path }) => enabled || currentRelPath === path
    )
  }, [currentRelPath, filtered])
}

function useCurrentTab() {
  const pathMatch = useMatch(`${EDGE_ABS_PATH}/:tab/*`)

  return pathMatch?.params?.tab || ''
}

export { useDirectory, useCurrentTab }
