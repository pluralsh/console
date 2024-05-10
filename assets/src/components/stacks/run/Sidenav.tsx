import { ReactNode, useMemo, useRef } from 'react'
import { useTheme } from 'styled-components'
import { Link, useLocation } from 'react-router-dom'
import { AppIcon, Tab, TabList } from '@pluralsh/design-system'

import { ResponsiveLayoutSidenavContainer } from '../../utils/layout/ResponsiveLayoutSidenavContainer'
import { StackTypeIcon } from '../StackType'
import { StackedText } from '../../utils/table/StackedText'
import { StackRun } from '../../../generated/graphql'
import BuildStatus from '../../builds/BuildStatus'

const DIRECTORY = [
  { path: '', label: 'Progress' },
  { path: 'state', label: 'State' },
]

interface StackRunSidenavProps {
  stackRun: StackRun
}

export default function StackRunSidenav({
  stackRun,
}: StackRunSidenavProps): ReactNode {
  const theme = useTheme()
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentTab = useMemo(
    () => DIRECTORY.find((d) => pathname.endsWith(d.path)),
    [pathname]
  )

  return (
    <ResponsiveLayoutSidenavContainer>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <StackRunSidenavHeader stackRun={stackRun} />
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'vertical',
            selectedKey: currentTab?.path,
          }}
        >
          {DIRECTORY.map(({ label, path }) => (
            <Tab
              key={path}
              as={Link}
              to={path}
              textDecoration="none"
            >
              {label}
            </Tab>
          ))}
        </TabList>
      </div>
    </ResponsiveLayoutSidenavContainer>
  )
}

interface StackRunSidenavHeaderProps {
  stackRun: StackRun
}

function StackRunSidenavHeader({
  stackRun,
}: StackRunSidenavHeaderProps): ReactNode {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.medium,
      }}
    >
      <AppIcon
        icon={<StackTypeIcon type={stackRun.type} />}
        size="small"
      />
      <StackedText
        first={stackRun.id}
        second={
          <BuildStatus
            status={stackRun.status}
            size="small"
          />
        }
      />
    </div>
  )
}
