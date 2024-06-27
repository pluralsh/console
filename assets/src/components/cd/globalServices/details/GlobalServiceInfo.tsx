import { useTheme } from 'styled-components'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { useOutletContext } from 'react-router-dom'

import { GlobalServiceContextT, getBreadcrumbs } from './GlobalService'

export default function GlobalServiceInfo() {
  const theme = useTheme()
  const { globalServiceId, globalService } =
    useOutletContext<GlobalServiceContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(globalServiceId, globalService),
        { label: 'info' },
      ],
      [globalServiceId, globalService]
    )
  )

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.medium,
        alignItems: 'flex-start',
        height: '100%',
      }}
    >
      info
    </div>
  )
}
