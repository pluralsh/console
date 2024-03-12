import { useOutletContext } from 'react-router-dom'

import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { KubernetesOutletContextT } from '../Kubernetes'
import {
  getCustomResourcesAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

export default function CustomResources() {
  const { cluster } = useOutletContext() as KubernetesOutletContextT

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
          label: 'custom resources',
          url: getCustomResourcesAbsPath(cluster?.id),
        },
      ],
      [cluster]
    )
  )

  return <>CustomResources</>
}
