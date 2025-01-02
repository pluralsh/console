import { MutableRefObject, ReactNode, useCallback, useRef } from 'react'
import {
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { getProviderIconUrl } from 'components/utils/Provider'

import { ProviderToDisplayName } from './helpers'
import { ProviderCloud } from './types'

export function ProviderTabSelector({
  enabledProviders = [],
  onProviderChange,
  children,
  selectedProvider,
}: {
  onProviderChange: any
  children: ReactNode
  enabledProviders: ProviderCloud[]
  selectedProvider: Nullable<string>
}) {
  const theme = useTheme()
  const tabStateRef: MutableRefObject<any> = useRef(undefined)
  const orientation = 'horizontal'

  selectedProvider = selectedProvider || 'aws'
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    selectedKey: selectedProvider,
    onSelectionChange: onProviderChange,
  }

  const isDisabled = useCallback(
    (p) => !enabledProviders.some((enabledP) => p === enabledP),

    [enabledProviders]
  )

  return (
    <>
      <TabList
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
        css={{
          width: 'fit-content',
          border: theme.borders.default,
          borderRadius: theme.borderRadiuses.medium,
        }}
      >
        {Object.values(ProviderCloud).map((p) => {
          const logoUrl = getProviderIconUrl(p, theme.mode)

          return (
            <SubTab
              css={{
                display: 'flex',
                gap: theme.spacing.xsmall,
                alignItems: 'center',
              }}
              disabled={isDisabled(p)}
              key={p}
              textValue={ProviderToDisplayName[p]}
            >
              <img
                src={logoUrl}
                css={{
                  width: 16,
                  ...(isDisabled(p)
                    ? { filter: 'grayscale(100%)', opacity: '50%' }
                    : {}),
                }}
              />
              {ProviderToDisplayName[p]}
            </SubTab>
          )
        })}
      </TabList>
      <TabPanel
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
