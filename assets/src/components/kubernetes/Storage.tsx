import { useTheme } from 'styled-components'
import { useOutletContext } from 'react-router-dom'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import {
  STORAGE_REL_PATH,
  getKubernetesAbsPath,
} from '../../routes/kubernetesRoutesConsts'

import { KubernetesContext } from './Kubernetes'

export default function Storage() {
  const theme = useTheme()
  const { cluster } = useOutletContext() as KubernetesContext

  useSetBreadcrumbs(
    useMemo(
      () => [
        {
          label: 'kubernetes',
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: cluster?.name ?? '',
          url: getKubernetesAbsPath(cluster?.id),
        },
        {
          label: 'storage',
          url: `${getKubernetesAbsPath(cluster?.id)}/${STORAGE_REL_PATH}`,
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
      pvc pv storageclasses
    </div>
  )
}
