import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import {
  IconFrame,
  toFillLevel,
  useFillLevel,
  type styledTheme,
} from '@pluralsh/design-system'

import { ClusterDistro } from 'generated/graphql'

import { getProviderIconUrl } from './Provider'
import { fillLevelToBorderColor } from './List'
import { fillLevelToBackground } from './FillLevelDiv'

const DISTRO_ICON_PATH = '/cluster-distros' as const

export const ClusterProviderIcons = {
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

export function getDistroProviderIconUrl({
  distro,
  provider,
  mode,
}: {
  distro: Nullable<ClusterDistro>
  provider?: Nullable<string>
  mode: typeof styledTheme.mode
}) {
  return (
    ClusterProviderIcons[distro?.toUpperCase() ?? '']?.[mode] ||
    (provider
      ? getProviderIconUrl(provider, mode)
      : ClusterProviderIcons[ClusterDistro.Generic]?.[mode] ||
        ClusterProviderIcons[ClusterDistro.Generic]?.dark)
  )
}

export function useDistroProviderIconUrl({
  distro,
  provider,
}: {
  distro: Nullable<ClusterDistro>
  provider: Nullable<string>
}) {
  const theme = useTheme()

  return getDistroProviderIconUrl({ distro, provider, mode: theme.mode })
}

export function DistroProviderIcon({
  distro,
  provider,
  size,
  ...props
}: {
  distro: Nullable<ClusterDistro>
  provider?: Nullable<string>
  size?: number
} & ComponentProps<'img'>) {
  const src = useDistroProviderIconUrl({ distro, provider })

  return (
    <img
      alt={ClusterDistroLongNames[distro ?? ''] || 'Unknown provider'}
      src={src}
      {...props}
      {...(size ? { width: size } : {})}
    />
  )
}

export function DistroProviderIconFrame({
  distro,
  provider,
  tooltip,
  fillLevel: fillLevelProp,
  ...props
}: {
  distro: Nullable<ClusterDistro>
  provider?: Nullable<string>
  tooltip?: boolean | ComponentProps<typeof IconFrame>['tooltip']
  fillLevel?: number
} & Omit<ComponentProps<typeof IconFrame>, 'icon'>) {
  const { colors } = useTheme()
  const inferredFillLevel = useFillLevel() + 1
  const fillLevel = fillLevelProp ?? inferredFillLevel
  return (
    <IconFrame
      css={{
        background: colors[fillLevelToBackground[toFillLevel(fillLevel)]],
        borderColor: colors[fillLevelToBorderColor[toFillLevel(fillLevel)]],
      }}
      textValue={getClusterDistroName(distro, 'long')}
      tooltip={
        typeof tooltip === 'boolean'
          ? tooltip
            ? getClusterDistroName(distro, 'short')
            : undefined
          : tooltip
      }
      icon={
        <DistroProviderIcon
          distro={distro}
          provider={provider}
        />
      }
      {...props}
    />
  )
}
