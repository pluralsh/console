import { isExternalUrl } from '../../utils/urls'

export * from '../../utils/urls'

export const stripMdExtension = (url?: string) => {
  url = url ?? ''
  if (!isExternalUrl(url)) {
    return url.replace(/.md$/, '')
  }

  return url
}

export const providerToProviderName: Record<string, string> = {
  GCP: 'GCP',
  AWS: 'AWS',
  AZURE: 'Azure',
  EQUINIX: 'Equinix',
  KIND: 'kind',
  CUSTOM: 'Custom',
  KUBERNETES: 'Kubernetes',
  GENERIC: 'Generic',
}
