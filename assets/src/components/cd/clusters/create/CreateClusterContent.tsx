import {
  Key,
  MutableRefObject,
  ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  ClusterProvider,
  useClusterProvidersQuery,
} from '../../../../generated/graphql'
import LoadingIndicator from '../../../utils/LoadingIndicator'

import { AWS } from './provider/AWS'
import { ProviderToDisplayName, ProviderToLogo } from './helpers'
import { Provider } from './types'
import { GCP } from './provider/GCP'
import { Azure } from './provider/Azure'

export function CreateClusterContent(): ReactElement {
  const theme = useTheme()
  const [provider, setProvider] = useState<Key>(Provider.GCP)

  const { data, loading } = useClusterProvidersQuery()
  // TODO: remove once other providers are supported
  const isDisabled = useCallback(
    (p: Provider) => [Provider.AWS, Provider.Azure].includes(p),
    []
  )
  const clusterProviders: Array<ClusterProvider> = useMemo(
    () =>
      data?.clusterProviders?.edges
        ?.map((e) => e!.node as ClusterProvider)
        .filter((p) => p?.cloud === provider) ?? [],
    [data?.clusterProviders?.edges, provider]
  )

  const tabStateRef: MutableRefObject<any> = useRef()
  const orientation = 'horizontal'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    selectedKey: provider,
    onSelectionChange: setProvider,
  }

  const providerEl = useMemo(() => {
    switch (provider) {
      case Provider.AWS:
        return <AWS />
      case Provider.GCP:
        return <GCP clusterProviders={clusterProviders} />
      case Provider.Azure:
        return <Azure />
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
          const Logo = ProviderToLogo[p]

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
        {loading && <LoadingIndicator />}
        {!loading && providerEl}
      </TabPanel>
    </div>
  )
}
