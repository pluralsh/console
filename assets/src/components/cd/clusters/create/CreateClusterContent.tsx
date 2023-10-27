import {
  ComponentType,
  Dispatch,
  Key,
  MutableRefObject,
  ReactElement,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  FormField,
  Input,
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { IconProps } from 'honorable'

import { isNonNullable } from 'utils/isNonNullable'

import {
  CloudSettingsAttributes,
  ClusterAttributes,
  useClusterProvidersQuery,
} from '../../../../generated/graphql'
import LoadingIndicator from '../../../utils/LoadingIndicator'

import { ClusterProviderSelect } from '../../utils/ProviderSelect'

import { AWS } from './provider/AWS'
import { ProviderToDisplayName, ProviderToLogo } from './helpers'
import { Provider, ProviderState } from './types'
import { GCP } from './provider/GCP'
import { Azure } from './provider/Azure'

interface ProviderSelector {
  onProviderChange: Dispatch<Provider>
}

function ProviderSelector({ onProviderChange, children }): ReactElement {
  const theme = useTheme()

  const [provider, setProvider] = useState<Key>(Provider.GCP)

  const tabStateRef: MutableRefObject<any> = useRef()
  const orientation = 'horizontal'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    selectedKey: provider,
    onSelectionChange: (p) => {
      setProvider(p)
      onProviderChange(p)
    },
  }

  // TODO: remove once other providers are supported
  const isDisabled = useCallback(
    (p: Provider) => [Provider.AWS, Provider.Azure].includes(p),
    []
  )

  return (
    <>
      <TabList
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
        css={{
          width: 'fit-content',
          border: theme.borders.default,
          borderRadius: theme.borderRadiuses.normal,
        }}
      >
        {Object.values(Provider).map((p) => {
          const Logo: ComponentType<IconProps> = ProviderToLogo[p]

          return (
            <SubTab
              css={{
                display: 'flex',
                gap: theme.spacing.xsmall,
              }}
              disabled={isDisabled(p)}
              key={p}
              textValue={ProviderToDisplayName[p]}
            >
              <Logo fullColor />
              {ProviderToDisplayName[p]}
            </SubTab>
          )
        })}
      </TabList>

      <TabPanel
        key={provider}
        tabKey={provider}
        mode="multipanel"
        stateRef={tabStateRef}
        css={{
          borderTop: theme.borders.default,
          paddingTop: theme.spacing.large,
        }}
      >
        {children}
      </TabPanel>
    </>
  )
}

interface CreateClusterContentProps extends ProviderState {
  onChange: Dispatch<SetStateAction<ClusterAttributes>>
}

export function CreateClusterContent({
  onChange,
  onValidityChange,
}: CreateClusterContentProps): ReactElement {
  const theme = useTheme()

  const [provider, setProvider] = useState<Key>(Provider.GCP)
  const [clusterProvider, setClusterProvider] = useState<Key>()
  const [providerValid, setProviderValid] = useState(false)
  const [name, setName] = useState<string>()
  const [handle, setHandle] = useState<string>()
  const [version, setVersion] = useState<string>()
  const [cloudSettings, setCloudSettings] = useState<CloudSettingsAttributes>(
    {} as CloudSettingsAttributes
  )

  const { data: clusterProvidersQuery, loading } = useClusterProvidersQuery()

  const clusterProviders = useMemo(
    () =>
      clusterProvidersQuery?.clusterProviders?.edges
        ?.map((e) => e!.node)
        .filter(isNonNullable)
        .filter((p) => p?.cloud === provider) ?? [],
    [clusterProvidersQuery?.clusterProviders?.edges, provider]
  )
  const providerEl = useMemo(() => {
    switch (provider) {
      case Provider.AWS:
        return <AWS />
      case Provider.GCP:
        return (
          <GCP
            onValidityChange={setProviderValid}
            onChange={setCloudSettings}
          />
        )
      case Provider.Azure:
        return <Azure />
    }
  }, [provider])
  const isValid = useMemo(
    () => !!clusterProvider && !!name && !!version && providerValid,
    [clusterProvider, name, version, providerValid]
  )
  const attributes = useMemo(
    () =>
      ({
        name,
        handle,
        version,
        providerId: clusterProvider,
        cloudSettings,
      }) as ClusterAttributes,
    [name, handle, version, clusterProvider, cloudSettings]
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
      <ProviderSelector onProviderChange={setProvider}>
        {loading && <LoadingIndicator />}
        {!loading && (
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.large,
            }}
          >
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
              }}
            >
              <Input
                width="fit-content"
                placeholder="workload-cluster-0"
                value={name}
                onChange={({ target: { value } }) => setName(value)}
                prefix={<div>Name*</div>}
              />
              <Input
                placeholder="v1.24.11"
                value={version}
                onChange={({ target: { value } }) => setVersion(value)}
                prefix={<div>Version*</div>}
              />
            </div>
            <Input
              placeholder="custom-handle"
              value={handle}
              onChange={({ target: { value } }) => setHandle(value)}
              prefix={<div>Handle</div>}
            />
            <FormField
              label="Cluster provider"
              hint="Configured cluster provider that should be used to provision the cluster."
              required
            >
              <ClusterProviderSelect
                aria-label="cluster provider"
                selectedKey={clusterProvider}
                onSelectionChange={(key) => {
                  setClusterProvider(key)
                }}
                clusterProviders={clusterProviders}
              />
            </FormField>
            {providerEl}
          </div>
        )}
      </ProviderSelector>
    </div>
  )
}
