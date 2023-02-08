import {
  AppsIcon,
  Card,
  Chip,
  CloseIcon,
  EmptyState,
  ErrorIcon,
  IconFrame,
  Input,
  MagnifyingGlassIcon,
  StatusIpIcon,
  SuccessIcon,
} from '@pluralsh/design-system'
import { appState, getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { Layer } from 'grommet'
import sortBy from 'lodash/sortBy'
import { useContext, useMemo, useState } from 'react'
import { Readiness, ReadinessT } from 'utils/status'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import AppStatus from 'components/apps/AppStatus'
import Fuse from 'fuse.js'
import { isEmpty } from 'lodash'

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

function StatusIcon({ readiness }: {readiness: ReadinessT}) {
  if (!readiness) return null

  switch (readiness) {
  case Readiness.Failed:
    return (
      <IconFrame
        size="xsmall"
        icon={<ErrorIcon color="icon-danger" />}
      />
    )
  case Readiness.InProgress:
    return (
      <IconFrame
        size="xsmall"
        icon={<StatusIpIcon color="icon-warning" />}
      />
    )
  default:
    return (
      <IconFrame
        size="xsmall"
        icon={<SuccessIcon color="icon-success" />}
      />
    )
  }
}

const StatusPanelTopContainer = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
  padding: theme.spacing.medium,
  position: 'sticky',
  top: 0,
}))

const StatusPanelHeaderWrap = styled.div({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
})

const StatusPanelHeader = styled.div({
  fontSize: 18,
  fontWeight: 500,
  lineHeight: '24px',
})

const AppStatusWrap = styled.div<{last: boolean}>(({ theme, last = false }) => ({
  alignItems: 'center',
  cursor: 'pointer',
  borderBottom: !last ? theme.borders['fill-two'] : undefined,
  display: 'flex',
  padding: '12px 16px',
  '&:hover': {
    backgroundColor: theme.colors['fill-two-hover'],
  },
}))

const AppIcon = styled.img({
  height: 16,
  width: 16,
})

const AppName = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  marginLeft: 8,
}))

const AppVersion = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'flex',
  flexGrow: 1,
  marginLeft: 8,
}))

const searchOptions = {
  keys: ['app.name'],
  threshold: 0.25,
  shouldSort: false,
}

export function StatusPanel({ statuses, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>('')

  const apps = useMemo(() => {
    if (isEmpty(query)) return statuses.map(({ app }) => app)

    const fuse = new Fuse<{app, readiness}>(statuses, searchOptions)

    return fuse.search(query).map(({ item: { app } }) => app)
  }, [query, statuses])

  return (
    <Layer
      plain
      onClickOutside={onClose}
      position="top-right"
      margin={{ top: '105px', right: '24px', bottom: '24px' }}
    >
      <Card
        fillLevel={2}
        width={420}
        overflow="auto"
        position="relative"
      >
        <StatusPanelTopContainer>
          <StatusPanelHeaderWrap>
            <StatusPanelHeader>Apps</StatusPanelHeader>
            <IconFrame
              clickable
              icon={<CloseIcon />}
              onClick={e => onClose(e)}
            />
          </StatusPanelHeaderWrap>
          <Input
            marginTop="xsmall"
            placeholder="Filter applications"
            startIcon={<MagnifyingGlassIcon size={14} />}
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </StatusPanelTopContainer>
        {apps.map((app, i) => (
          <AppStatusWrap
            onClick={() => {
              onClose()
              navigate(`/apps/${app.name}`)
            }}
            last={i === apps.length - 1}
          >
            {hasIcons(app) && <AppIcon src={getIcon(app)} /> }
            <AppName>{app.name}</AppName>
            {app.spec?.descriptor?.version && <AppVersion>v{app.spec.descriptor.version}</AppVersion>}
            <AppStatus app={app} />
          </AppStatusWrap>
        ))}
        {isEmpty(apps) && (
          <EmptyState
            message="No apps found."
            description={`"${query}" did not match any of your installed applications.`}
          />
        )}
      </Card>
    </Layer>
  )
}

export default function AppNav() {
  const [open, setOpen] = useState<boolean>(false)
  const { applications = [] } = useContext<any>(InstallationContext)

  const statuses = useMemo(() => {
    const unsorted = applications.map(app => ({ app, ...appState(app) }))

    return sortBy(unsorted, [({ readiness }) => readinessOrder(readiness), 'app.name'])
  }, [applications])

  return (
    <>
      <Chip
        backgroundColor={open ? 'fill-one-selected' : 'fill-one'}
        icon={<AppsIcon />}
        clickable
        onClick={() => setOpen(true)}
        size="small"
      >
        Apps
        <StatusIcon readiness={statuses.length > 0 && statuses[0].readiness} />
      </Chip>
      {open && (
        <StatusPanel
          statuses={statuses}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
