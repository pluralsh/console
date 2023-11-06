import { useEffect, useMemo } from 'react'
import { FormField, usePrevious } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Link } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'

import { ClusterAttributes, ClusterProviderFragment } from 'generated/graphql'

import { CD_BASE_PATH } from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { Body1P } from 'components/utils/typography/Text'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { ProviderCredentialSelect } from 'components/cd/utils/ProviderCredsSelect'

import { AWS, settingsAreValidAws } from './provider/AWS'
import { ProviderCloud } from './types'
import { GCP, settingsAreValidGcp } from './provider/GCP'
import { Azure, settingsAreValidAzure } from './provider/Azure'
import { NameVersionHandle } from './NameVersionHandle'
import { ProviderTabSelector } from './ProviderTabSelector'
import { ClusterCreateMode, useCreateClusterContext } from './CreateCluster'
import { ClusterTagSelection } from './ClusterTagSelection'

const requiredProps: (keyof ClusterAttributes)[] = [
  'providerId',
  'name',
  'version',
]

export function isRequired(propName: keyof ClusterAttributes) {
  return requiredProps.some((p) => p === propName)
}

export function attributesAreValid(
  attributes: Partial<ClusterAttributes>,
  cloud?: Nullable<string>
) {
  if (!cloud) {
    return false
  }

  return (
    requiredProps.reduce(
      (acc, reqProp) => acc && !!attributes?.[reqProp],
      true
    ) &&
    (cloud === ProviderCloud.AWS
      ? settingsAreValidAws(attributes.cloudSettings?.aws || {})
      : cloud === ProviderCloud.GCP
      ? settingsAreValidGcp(attributes.cloudSettings?.gcp || {})
      : cloud === ProviderCloud.Azure
      ? settingsAreValidAzure(attributes.cloudSettings?.azure || {})
      : false)
  )
}

export function CreateClusterContent({
  providers: clusterProviders,
}: {
  providers: ClusterProviderFragment[]
}) {
  const theme = useTheme()

  const {
    new: { attributes, setAttributes },
  } = useCreateClusterContext()

  const enabledProviders = useMemo(
    () => clusterProviders.map((p) => p.cloud) as ProviderCloud[],
    [clusterProviders]
  )

  const provider =
    clusterProviders.find(
      (provider) => provider.id === attributes.providerId
    ) || clusterProviders?.[0]
  const prevProvider = usePrevious(provider)
  const credentialList = useMemo(
    () => [...(provider?.credentials?.filter(isNonNullable) || [])],
    [provider?.credentials]
  )

  // Make sure version remains valid when provider changes
  useEffect(() => {
    if (
      provider !== prevProvider &&
      !provider.supportedVersions?.some(
        (version) => version === attributes.version
      )
    ) {
      setAttributes({ ...attributes, version: '' })
    }
  }, [provider, attributes.version, attributes, setAttributes, prevProvider])

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
        return <AWS />
      case ProviderCloud.GCP:
        return <GCP />
      case ProviderCloud.Azure:
        return <Azure />
      default:
        return null
    }
  }, [provider])

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
                required={isRequired('credentialId')}
              >
                <ProviderCredentialSelect
                  aria-label="cluster provider"
                  selectedKey={attributes.credentialId || ''}
                  credentials={credentialList}
                  onSelectionChange={(key) => {
                    const credentialId = credentialList?.find(
                      (c) => c.id === key
                    )?.id

                    setAttributes((attrs) => ({
                      ...attrs,
                      ...(credentialId ? { credentialId } : {}),
                    }))
                  }}
                />
              </FormField>
            )}
            <ClusterTagSelection mode={ClusterCreateMode.New} />
            {providerEl}
          </div>
        )}
      </ProviderTabSelector>
    </div>
  )
}
