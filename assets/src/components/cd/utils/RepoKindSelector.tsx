import { MutableRefObject, ReactNode, useRef } from 'react'
import {
  GitHubLogoIcon,
  SubTab,
  TabList,
  TabListStateProps,
  TabPanel,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import ProviderIcon, { ProviderIcons } from 'components/utils/Provider'

export enum RepoKind {
  Git = 'Git',
  Helm = 'Helm',
}

export function repoKindToLabel(repoKind: RepoKind) {
  return repoKind === RepoKind.Helm ? 'Helm' : 'Git'
}

export function RepoKindSelector({
  onKindChange,
  selectedKind,
  children,
}: {
  onKindChange: any
  selectedKind: Nullable<string>
  children?: ReactNode
}) {
  const theme = useTheme()
  const tabStateRef: MutableRefObject<any> = useRef()
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
          position: 'relative',
          borderRadius: theme.borderRadiuses.normal,
          '&::after': {
            pointerEvents: 'none',
            content: '""',
            outline: theme.borders.default,
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            outlineOffset: -1,
            borderRadius: theme.borderRadiuses.normal,
          },
        }}
      >
        <SubTab
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
          key={RepoKind.Git}
          textValue={repoKindToLabel(RepoKind.Git)}
        >
          <GitHubLogoIcon fullColor />
          {repoKindToLabel(RepoKind.Git)}
        </SubTab>
        <SubTab
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
          key={RepoKind.Helm}
          textValue={repoKindToLabel(RepoKind.Helm)}
        >
          <div css={{ display: 'flex', alignItems: 'center' }}>
            <ProviderIcon
              provider={ProviderIcons.GENERIC}
              width={16}
            />
          </div>
          {repoKindToLabel(RepoKind.Helm)}
        </SubTab>
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
