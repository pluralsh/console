import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { FormField } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'

import {
  CloudSettingsAttributes,
  ClusterAttributes,
  ClusterProviderFragment,
  ProviderCredentialFragment,
  useClusterProvidersQuery,
} from 'generated/graphql'

import { CD_BASE_PATH } from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { Body1P } from 'components/utils/typography/Text'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { ProviderCredentialSelect } from 'components/cd/utils/ProviderCredsSelect'

import { AWS } from './provider/AWS'
import { ProviderCloud, ProviderState } from './types'
import { GCP } from './provider/GCP'
import { Azure } from './provider/Azure'
import { NameVersionHandle } from './NameVersionHandle'
import { ProviderTabSelector } from './ProviderTabSelector'

interface CreateClusterContentProps extends ProviderState {
  onChange: Dispatch<SetStateAction<ClusterAttributes>>
}

export function CreateClusterContent({
  onChange,
  onValidityChange,
}: CreateClusterContentProps): ReactElement {
  const theme = useTheme()

  const [provider, setProvider] = useState<
    ClusterProviderFragment | undefined
  >()
  const [selectedCreds, setSelectedCreds] =
    useState<Nullable<ProviderCredentialFragment>>()
  const [providerValid, setProviderValid] = useState(false)
  const [name, setName] = useState<string>('')
  const [handle, setHandle] = useState<string>('')
  const [version, setVersion] = useState<string>('')
  const [cloudSettings, setCloudSettings] = useState<CloudSettingsAttributes>(
    {} as CloudSettingsAttributes
  )
  const { data: clusterProvidersQuery, loading } = useClusterProvidersQuery()

  const clusterProviders = useMemo(
    () => mapExistingNodes(clusterProvidersQuery?.clusterProviders),
    [clusterProvidersQuery?.clusterProviders]
  )
  const enabledProviders = useMemo(
    () =>
      clusterProviders
        .filter((p) => !p.deletedAt)
        .map((p) => p.cloud) as ProviderCloud[],
    [clusterProviders]
  )
  const credentialList = useMemo(
    () => [...(provider?.credentials?.filter(isNonNullable) || [])],
    [provider?.credentials]
  )

  useEffect(() => {
    if (
      !enabledProviders.some(
        (enabledProvider) => enabledProvider === provider?.cloud
      )
    ) {
      setProvider(clusterProviders?.[0])
    }
  }, [enabledProviders, clusterProviders, provider?.cloud])

  const providerEl = useMemo(() => {
    switch (provider?.cloud) {
      case ProviderCloud.AWS:
        return <AWS />
      case ProviderCloud.GCP:
        return (
          <GCP
            onValidityChange={setProviderValid}
            onChange={setCloudSettings}
          />
        )
      case ProviderCloud.Azure:
        return <Azure />
      default:
        return null
    }
  }, [provider])

  const isValid = useMemo(
    () => !!provider?.id && !!name && !!version && providerValid,
    [provider, name, version, providerValid]
  )
  const attributes = useMemo(
    () =>
      ({
        name,
        handle,
        version,
        providerId: provider?.id,
        cloudSettings,
        ...(selectedCreds?.id ? { credentialId: selectedCreds.id } : {}),
      }) as ClusterAttributes,
    [name, handle, version, provider?.id, cloudSettings, selectedCreds?.id]
  )

  useEffect(() => onValidityChange?.(isValid), [onValidityChange, isValid])
  useEffect(() => onChange?.(attributes), [onChange, attributes])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <ProviderTabSelector
        selectedProvider={provider?.cloud}
        onProviderChange={(cloud) => {
          setProvider(clusterProviders.find((p) => p.cloud === cloud))
        }}
        enabledProviders={enabledProviders}
      >
        {loading ? (
          <LoadingIndicator />
        ) : isEmpty(enabledProviders) ? (
          <Body1P>
            No providers have been set up. You can add cloud providers{' '}
            <InlineLink
              as={Link}
              to={`/${CD_BASE_PATH}/providers`}
            >
              here
            </InlineLink>
            .
          </Body1P>
        ) : (
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.large,
            }}
          >
            <NameVersionHandle
              {...{
                name,
                setName,
                version,
                setVersion,
                versions: provider?.supportedVersions,
                handle,
                setHandle,
              }}
            />
            {credentialList && !isEmpty(credentialList) && (
              <FormField
                label="Provider credentials"
                hint="Configured cluster provider that should be used to provision the cluster."
              >
                <ProviderCredentialSelect
                  aria-label="cluster provider"
                  selectedKey={selectedCreds?.id || ''}
                  credentials={credentialList}
                  onSelectionChange={(key) => {
                    setSelectedCreds(credentialList?.find((c) => c.id === key))
                  }}
                />
              </FormField>
            )}
            {providerEl}
          </div>
        )}
      </ProviderTabSelector>
    </div>
  )
}
