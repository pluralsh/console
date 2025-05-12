import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { useOidcProvidersQuery } from 'generated/graphql'
import { useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { OidcProvider } from './OidcProvider'
import { OidcProviders } from './OidcProviders'

export function OidcSettings() {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  )

  const { data, loading, error } = useOidcProvidersQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const providers = mapExistingNodes(data?.oidcProviders)

  if (error) return <GqlError error={error} />

  const selectedProvider = providers.find(
    (provider) => provider.id === selectedProviderId
  )

  return selectedProvider ? (
    <OidcProvider
      provider={selectedProvider}
      onBack={() => setSelectedProviderId(null)}
    />
  ) : (
    <OidcProviders
      providers={providers}
      loading={!data && loading}
      setSelectedProviderId={setSelectedProviderId}
    />
  )
}
