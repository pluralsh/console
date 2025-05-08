import { OidcProviderFragment } from 'generated/graphql'
import { useState } from 'react'
import { OidcProvider } from './OidcProvider'
import { OidcProviders } from './OidcProviders'

export function OidcSettings() {
  const [selectedProvider, setSelectedProvider] =
    useState<OidcProviderFragment | null>(null)

  return selectedProvider ? (
    <OidcProvider
      provider={selectedProvider}
      onBack={() => setSelectedProvider(null)}
    />
  ) : (
    <OidcProviders setSelectedProvider={setSelectedProvider} />
  )
}
