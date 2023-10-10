import { Key, ReactElement, useMemo, useRef, useState } from 'react'
import {
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { AWS } from './provider/AWS'
import { ProviderToDisplayName, ProviderToLogo } from './helpers'
import { Provider } from './types'
import { GCP } from './provider/GCP'
import { Azure } from './provider/Azure'

export function CreateClusterContent(): ReactElement {
  const theme = useTheme()
  const [provider, setProvider] = useState<Key>(Provider.AWS)

  const tabStateRef = useRef()
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
        return <GCP />
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
        {providerEl}
      </TabPanel>
    </div>
  )
}
