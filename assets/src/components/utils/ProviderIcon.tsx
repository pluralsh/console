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
  let url = ProviderIcons[provider] || DEFAULT_CHART_ICON

  if (dark && DarkProviderIcons[provider]) {
    url = DarkProviderIcons[provider]
  }

  return url
}

export default function ProviderIcon({
  provider,
  width,
}: {
  provider: string
  width: number
}) {
  return (
    <img
      alt={provider}
      width={width}
      src={providerToURL(provider, true)}
    />
  )
}
