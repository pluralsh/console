import { useTheme } from 'styled-components'

import { Provider } from 'generated/graphql-plural'

export const DEFAULT_CHART_ICON = '/chart.png'
export const DEFAULT_GCP_ICON = '/gcp.png'
export const DEFAULT_AZURE_ICON = '/azure.png'
export const DEFAULT_AWS_ICON = '/aws.png'
export const DEFAULT_EQUINIX_ICON = '/equinix-metal.png'
export const DEFAULT_KIND_ICON = '/kind.png'
export const DARK_AWS_ICON = '/aws-icon.png'

const ProviderNames = {
  aws: 'AWS',
  azure: 'Azure',
  equinix: 'Equinix',
  gcp: 'GCP',
  kind: 'kind',
  generic: 'Generic',
  custom: 'Custom',
  kubernetes: 'Kubernetes',
} as const satisfies Record<Lowercase<Provider>, string>

export function getProviderName(provider?: string | null) {
  const p = provider?.toLowerCase()

  return p && ProviderNames[p] ? ProviderNames[p] : 'BYOK'
}

export const ProviderIcons = {
  GCP: DEFAULT_GCP_ICON,
  AWS: DEFAULT_AWS_ICON,
  AZURE: DEFAULT_AZURE_ICON,
  EQUINIX: DEFAULT_EQUINIX_ICON,
  KIND: DEFAULT_KIND_ICON,
  GENERIC: DEFAULT_CHART_ICON,
  CUSTOM: DEFAULT_CHART_ICON,
  KUBERNETES: DEFAULT_CHART_ICON,
} as const satisfies Record<Provider, string>

export const DarkProviderIcons = {
  AWS: DARK_AWS_ICON,
}

export function getProviderIconURL(
  provider: string | null | undefined,
  dark: boolean
): string {
  const p = provider ? provider.toUpperCase() : ''

  return dark && DarkProviderIcons[p]
    ? DarkProviderIcons[p]
    : ProviderIcons[p] || DEFAULT_CHART_ICON
}

export default function ProviderIcon({
  provider,
  width,
}: {
  provider: string
  width: number
}) {
  const theme = useTheme()

  return (
    <div css={{ display: 'flex', justifyContent: 'center', width }}>
      <img
        alt={getProviderName(provider) || provider}
        src={getProviderIconURL(provider, theme.mode !== 'light')}
        width={width}
      />
    </div>
  )
}
