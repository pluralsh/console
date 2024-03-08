import { useTheme } from 'styled-components'
import { useOutletContext } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import {
  SERVICES_REL_PATH,
  getKubernetesAbsPath,
} from '../../routes/kubernetesRoutesConsts'

export default function Services() {
  const theme = useTheme()
  const { cluster } = useOutletContext() as any

  useSetBreadcrumbs(
    useMemo(
      () => [
        {
          label: 'kubernetes',
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: cluster?.name,
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: 'services',
          url: `${getKubernetesAbsPath(cluster?.id)}/${SERVICES_REL_PATH}`,
        },
      ],
      [cluster]
    )
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      services ingresses
    </div>
  )
}
