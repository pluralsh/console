import { MutableRefObject, ReactNode, useRef } from 'react'
import {
  CheckOutlineIcon,
  FluxIcon,
  GitHubLogoIcon,
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import ProviderIcon from 'components/utils/Provider'
import { Provider } from 'generated/graphql-plural'

export enum RepoKind {
  Git = 'Git',
  Helm = 'Helm',
  Flux = 'Flux',
}

export function RepoKindSelector({
  onKindChange,
  selectedKind,
  children,
  validKinds,
  enableFlux = false,
}: {
  onKindChange: any
  selectedKind: Nullable<string>
  children?: ReactNode
  validKinds?: Record<string, boolean>
  enableFlux?: boolean
}) {
  const theme = useTheme()
  const tabStateRef: MutableRefObject<any> = useRef(undefined)
  const orientation = 'horizontal'

  selectedKind = selectedKind || RepoKind.Git
  const tabListStateProps: TabListStateProps = {
    keyboardActivation: 'manual',
    orientation,
    selectedKey: selectedKind,
    onSelectionChange: onKindChange,
  }

  return (
    <>
      <TabList
        stateRef={tabStateRef}
        stateProps={tabListStateProps}
        css={{
          width: 'fit-content',
          borderRadius: theme.borderRadiuses.medium,
          outline: theme.borders.default,
          outlineOffset: -1,
        }}
      >
        <SelectorSubtabSC
          $active={selectedKind === RepoKind.Git}
          key={RepoKind.Git}
          textValue={RepoKind.Git}
        >
          <GitHubLogoIcon color={theme.colors['icon-default']} />
          {RepoKind.Git}
          {validKinds?.[RepoKind.Git] && (
            <CheckOutlineIcon
              size={16}
              color={theme.colors['icon-success']}
            />
          )}
        </SelectorSubtabSC>
        <SelectorSubtabSC
          $active={selectedKind === RepoKind.Helm}
          key={RepoKind.Helm}
          textValue={RepoKind.Helm}
        >
          <div css={{ display: 'flex', alignItems: 'center' }}>
            <ProviderIcon
              provider={Provider.Generic}
              width={16}
            />
          </div>
          {RepoKind.Helm}
          {validKinds?.[RepoKind.Helm] && (
            <CheckOutlineIcon
              size={16}
              color={theme.colors['icon-success']}
            />
          )}
        </SelectorSubtabSC>
        {enableFlux ? (
          <SelectorSubtabSC
            $active={selectedKind === RepoKind.Flux}
            key={RepoKind.Flux}
            textValue={RepoKind.Flux}
          >
            <FluxIcon fullColor />
            {RepoKind.Flux}
            {validKinds?.[RepoKind.Flux] && (
              <CheckOutlineIcon
                size={16}
                color={theme.colors['icon-success']}
              />
            )}
          </SelectorSubtabSC>
        ) : null}
      </TabList>
      <TabPanel
        stateRef={tabStateRef}
        css={
          children
            ? {
                borderTop: theme.borders.default,
                paddingTop: theme.spacing.large,
              }
            : {}
        }
      >
        {children}
      </TabPanel>
    </>
  )
}

const SelectorSubtabSC = styled(SubTab)<{ $active?: boolean }>(
  ({ theme, $active }) => ({
    display: 'flex',
    gap: theme.spacing.xsmall,
    outline: $active ? theme.borders.input : undefined,
    outlineOffset: -1,
    '&:focus': { outline: theme.borders.input },
  })
)
