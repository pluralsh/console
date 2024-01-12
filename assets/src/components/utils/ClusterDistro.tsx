import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import { IconFrame, type styledTheme } from '@pluralsh/design-system'

import { ClusterDistro } from 'generated/graphql'

const DISTRO_ICON_PATH = '/cluster-distros' as const

export const ClusterDistroIcons = {
  [ClusterDistro.Aks]: {
    dark: `${DISTRO_ICON_PATH}/aks.svg`,
    light: `${DISTRO_ICON_PATH}/aks.svg`,
  },
  [ClusterDistro.Eks]: {
    dark: `${DISTRO_ICON_PATH}/eks-dark.svg`,
    light: `${DISTRO_ICON_PATH}/eks-light.svg`,
  },
  [ClusterDistro.Gke]: {
    dark: `${DISTRO_ICON_PATH}/gke-dark.svg`,
    light: `${DISTRO_ICON_PATH}/gke-light.svg`,
  },
  [ClusterDistro.K3S]: {
    dark: `${DISTRO_ICON_PATH}/k3s-dark.svg`,
    light: `${DISTRO_ICON_PATH}/k3s-light.svg`,
  },
  [ClusterDistro.Rke]: {
    dark: `${DISTRO_ICON_PATH}/rke.svg`,
    light: `${DISTRO_ICON_PATH}/rke.svg`,
  },
  [ClusterDistro.Generic]: {
    dark: `${DISTRO_ICON_PATH}/k8s.svg`,
    light: `${DISTRO_ICON_PATH}/k8s.svg`,
  },
} as const satisfies Record<
  ClusterDistro,
  Record<typeof styledTheme.mode, string>
>

export const ClusterDistroShortNames = {
  [ClusterDistro.Aks]: 'AKS',
  [ClusterDistro.Eks]: 'EKS',
  [ClusterDistro.Gke]: 'GKE',
  [ClusterDistro.K3S]: 'K3s',
  [ClusterDistro.Rke]: 'RKE',
  [ClusterDistro.Generic]: 'BYOK',
} as const satisfies Record<ClusterDistro, string>

export const ClusterDistroLongNames = {
  [ClusterDistro.Aks]: 'Azure Kubernetes Service (AKS)',
  [ClusterDistro.Eks]: `Amazon Elastic Kubernetes Service (EKS)`,
  [ClusterDistro.Gke]: 'Google Kubernetes Engine (AKS)',
  [ClusterDistro.K3S]: 'K3s',
  [ClusterDistro.Rke]: 'Rancher Kubernetes Engine (RKE)',
  [ClusterDistro.Generic]: 'BYOK',
} as const satisfies Record<ClusterDistro, string>

export function getClusterDistroName(
  distro: Nullable<ClusterDistro>,
  type: 'short' | 'long' = 'short'
) {
  const p = distro?.toUpperCase()
  const distroNames =
    type === 'long' ? ClusterDistroLongNames : ClusterDistroShortNames

  return p && distroNames[p] ? distroNames[p] : 'Unknown distro'
}

export function getClusterDistroIconUrl(
  distro: Nullable<ClusterDistro>,
  mode: typeof styledTheme.mode
) {
  return (
    ClusterDistroIcons[distro?.toUpperCase() ?? ''][mode] ||
    ClusterDistroIcons[ClusterDistro.Generic][mode] ||
    ClusterDistroIcons[ClusterDistro.Generic].dark
  )
}

export function useClusterDistroIconUrl(distro: Nullable<ClusterDistro>) {
  const theme = useTheme()

  return getClusterDistroIconUrl(distro, theme.mode)
}

export function ClusterDistroIcon({
  distro,
  size,
  ...props
}: {
  distro: Nullable<ClusterDistro>
  size?: number
} & ComponentProps<'img'>) {
  const src = useClusterDistroIconUrl(distro)

  return (
    <img
      alt={ClusterDistroLongNames[distro ?? ''] || 'Unknown distro'}
      src={src}
      {...props}
      {...(size ? { width: size } : {})}
    />
  )
}

export function ClusterDistroIconFrame({
  distro,
  ...props
}: {
  distro: Nullable<ClusterDistro>
} & Omit<ComponentProps<typeof IconFrame>, 'icon'>) {
  return (
    <IconFrame
      textValue={getClusterDistroName(distro, 'long')}
      tooltip={getClusterDistroName(distro, 'short')}
      icon={<ClusterDistroIcon distro={distro} />}
      {...props}
    />
  )
}
