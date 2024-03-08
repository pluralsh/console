import { useTheme } from 'styled-components'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import {
  WORKLOADS_REL_PATH,
  getKubernetesAbsPath,
} from '../../routes/kubernetesRoutesConsts'

import { KubernetesContext } from './Kubernetes'

export default function Workloads() {
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
          label: 'workloads',
          url: `${getKubernetesAbsPath(cluster?.id)}/${WORKLOADS_REL_PATH}`,
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
      deployments replicasets pods jobs cronjobs statefulsets daemonsets
      replicationcontrollers
    </div>
  )
}
