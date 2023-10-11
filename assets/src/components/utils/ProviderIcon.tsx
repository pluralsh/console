export const DEFAULT_CHART_ICON = '/chart.png'
export const DEFAULT_GCP_ICON = '/gcp.png'
export const DEFAULT_AZURE_ICON = '/azure.png'
export const DEFAULT_AWS_ICON = '/aws.png'
export const DEFAULT_EQUINIX_ICON = '/equinix-metal.png'
export const DEFAULT_KIND_ICON = '/kind.png'
export const DARK_AWS_ICON = '/aws-icon.png'

export const ProviderIcons = {
  GCP: DEFAULT_GCP_ICON,
  AWS: DEFAULT_AWS_ICON,
  AZURE: DEFAULT_AZURE_ICON,
  EQUINIX: DEFAULT_EQUINIX_ICON,
  KIND: DEFAULT_KIND_ICON,
  GENERIC: DEFAULT_CHART_ICON,
}

export const DarkProviderIcons = {
  AWS: DARK_AWS_ICON,
}

export function providerToURL(provider: string, dark: boolean) {
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
  return (
    <div css={{ display: 'flex', justifyContent: 'center', width }}>
      <img
        alt={provider}
        src={providerToURL(provider, true)}
        width={width}
      />
    </div>
  )
}
