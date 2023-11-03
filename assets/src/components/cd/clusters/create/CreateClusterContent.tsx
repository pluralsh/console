import { useEffect, useMemo, useState } from 'react'
import { FormField } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'

import { useClusterProvidersSuspenseQuery } from 'generated/graphql'

import { CD_BASE_PATH } from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { Body1P } from 'components/utils/typography/Text'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { ProviderCredentialSelect } from 'components/cd/utils/ProviderCredsSelect'

import { AWS } from './provider/AWS'
import { ProviderCloud } from './types'
import { GCP } from './provider/GCP'
import { Azure } from './provider/Azure'
import { NameVersionHandle } from './NameVersionHandle'
import { ProviderTabSelector } from './ProviderTabSelector'
import { SUPPORTED_CLOUDS, useCreateClusterContext } from './CreateCluster'

export function CreateClusterContent() {
  const theme = useTheme()
  const [providerValid, setProviderValid] = useState(false)

  const {
    create: { attributes, setAttributes, setValid },
  } = useCreateClusterContext()

  const { data: clusterProvidersQuery } = useClusterProvidersSuspenseQuery()

  const clusterProviders = useMemo(
    () =>
      mapExistingNodes(clusterProvidersQuery?.clusterProviders).filter((p) =>
        SUPPORTED_CLOUDS.some((cloud) => cloud === p.cloud)
      ),
    [clusterProvidersQuery?.clusterProviders]
  )
  const enabledProviders = useMemo(
    () =>
      clusterProviders
        .filter((p) => !p.deletedAt)
        .map((p) => p.cloud) as ProviderCloud[],
    [clusterProviders]
  )

  const provider =
    clusterProviders.find(
      (provider) => provider.id === attributes.providerId
    ) || clusterProviders?.[0]
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
      setAttributes((attrs) => ({
        ...attrs,
        providerId: clusterProviders?.[0]?.id,
      }))
    }
  }, [clusterProviders, enabledProviders, provider?.cloud, setAttributes])

  const providerEl = useMemo(() => {
    switch (provider?.cloud) {
      case ProviderCloud.AWS:
        return <AWS onValidityChange={setProviderValid} />
      case ProviderCloud.GCP:
        return <GCP onValidityChange={setProviderValid} />
      case ProviderCloud.Azure:
        return <Azure onValidityChange={setProviderValid} />
      default:
        return null
    }
  }, [provider])

  const isValid = useMemo(
    () =>
      !!attributes.providerId &&
      !!attributes.name &&
      !!attributes.version &&
      providerValid,
    [attributes.providerId, attributes.name, attributes.version, providerValid]
  )

  useEffect(() => setValid?.(isValid), [setValid, isValid])

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
          setAttributes((attrs) => ({
            ...attrs,
            providerId: clusterProviders?.find((p) => p.cloud === cloud)?.id,
          }))
        }}
        enabledProviders={enabledProviders}
      >
        {isEmpty(enabledProviders) ? (
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
                name: attributes.name || '',
                setName: (name) => {
                  setAttributes({ ...attributes, name })
                },
                version: attributes.version || '',
                setVersion: (version) =>
                  setAttributes({ ...attributes, version }),
                versions: provider?.supportedVersions,
                handle: attributes.handle || '',
                setHandle: (handle) => {
                  setAttributes({ ...attributes, handle })
                },
              }}
            />
            {credentialList && !isEmpty(credentialList) && (
              <FormField
                label="Provider credentials"
                hint="Configured cluster provider that should be used to provision the cluster."
              >
                <ProviderCredentialSelect
                  aria-label="cluster provider"
                  selectedKey={attributes.credentialId || ''}
                  credentials={credentialList}
                  onSelectionChange={(key) => {
                    setAttributes((attrs) => ({
                      ...attrs,
                      credentialId: credentialList?.find((c) => c.id === key),
                    }))
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
