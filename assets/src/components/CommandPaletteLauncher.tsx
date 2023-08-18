import {
  Chip,
  ErrorIcon,
  SearchIcon,
  StatusIpIcon,
  SuccessIcon,
} from '@pluralsh/design-system'
import { useKBar } from 'kbar'
import { appState } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import sortBy from 'lodash/sortBy'
import { useCallback, useContext, useMemo } from 'react'
import { Readiness, ReadinessT } from 'utils/status'

import { usePlatform } from 'components/hooks/usePlatform'
import styled, { useTheme } from 'styled-components'

function readinessOrder(readiness: ReadinessT) {
  switch (readiness) {
    case Readiness.Failed:
      return 0
    case Readiness.InProgress:
      return 1
    case Readiness.Ready:
      return 2
    default:
      return 3
  }
}

function StatusIcon({ readiness }: { readiness: ReadinessT }) {
  if (!readiness) return null
  const iconProps = {
    size: 12,
  }

  switch (readiness) {
    case Readiness.Failed:
      return (
        <ErrorIcon
          {...iconProps}
          color="icon-danger"
        />
      )
    case Readiness.InProgress:
      return (
        <StatusIpIcon
          {...iconProps}
          color="icon-warning"
        />
      )
    default:
      return (
        <SuccessIcon
          {...iconProps}
          color="icon-success"
        />
      )
  }
}

export const CommandPaletteLauncherSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  height: theme.spacing.xlarge,
  padding: `${0}px ${theme.spacing.medium}px`,
  background: theme.colors['fill-one'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  '&, .content': {
    display: 'flex',
    alignItems: 'center',
  },
  gap: theme.spacing.xsmall,
  '.content': {
    display: 'flex',
    gap: theme.spacing.small,
  },
  '&:hover': {
    background: theme.colors['fill-one-hover'],
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    border: theme.borders['outline-focused'],
  },
}))

export default function CommandPaletteLauncher() {
  const { applications = [] } = useContext<any>(InstallationContext)
  const kbar = useKBar()
  const toggleKbar = kbar.query.toggle

  const statuses = useMemo(() => {
    const unsorted = applications.map((app) => ({ app, ...appState(app) }))

    return sortBy(unsorted, [
      ({ readiness }) => readinessOrder(readiness),
      'app.name',
    ])
  }, [applications])

  const { modKeyString, keyCombinerString } = usePlatform()
  const onClick = useCallback(() => {
    toggleKbar()
  }, [toggleKbar])
  const theme = useTheme()

  return (
    <CommandPaletteLauncherSC onClick={onClick}>
      <div className="content">
        <SearchIcon
          size={16}
          color={theme.colors['text-light']}
        />
        <div>Search</div>
        <Chip
          fillLevel={3}
          size="small"
          userSelect="none"
          whiteSpace="nowrap"
        >
          {modKeyString}
          {keyCombinerString}K
        </Chip>
      </div>
      <StatusIcon readiness={statuses.length > 0 && statuses[0].readiness} />
    </CommandPaletteLauncherSC>
  )
}
