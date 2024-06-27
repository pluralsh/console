import { useTheme } from 'styled-components'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { useParams } from 'react-router-dom'

import { GLOBAL_SERVICE_PARAM_ID } from '../../../../routes/cdRoutesConsts'

import { getBreadcrumbs } from './GlobalService'

export default function GlobalServiceInfo() {
  const theme = useTheme()
  const serviceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(serviceId, null), { label: 'services' }],
      [serviceId]
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
