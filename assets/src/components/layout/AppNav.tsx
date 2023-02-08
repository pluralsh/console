import {
  AppsIcon,
  Card,
  Chip,
  CloseIcon,
  ErrorIcon,
  IconFrame,
  Input,
  StatusIpIcon,
  SuccessIcon,
} from '@pluralsh/design-system'
import { appState, getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { Layer } from 'grommet'
import { Div } from 'honorable'
import sortBy from 'lodash/sortBy'
import { useContext, useMemo, useState } from 'react'
import { Readiness, ReadinessT } from 'utils/status'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import AppStatus from 'components/apps/AppStatus'

function readinessOrder(readiness: ReadinessT) {
  switch (readiness) {
  case Readiness.Failed:
    return 0
  case Readiness.InProgress:
    return 1
  case Readiness.Ready:
    return 3
  default:
    return 4
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

export function StatusPanel({ statuses, onClose = _ => {} }) {
  const navigate = useNavigate()

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
        <Div
          backgroundColor="fill-two"
          position="sticky"
          top={0}
          padding="medium"
          borderBottom="1px solid border-fill-two"
        >
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
          />
        </Div>
        <Div>
          {statuses.map(({ app }, i) => (
            <AppStatusWrap
              onClick={() => navigate(`/apps/${app.name}`)}
              last={i === statuses.length - 1}
            >
              {hasIcons(app) && <AppIcon src={getIcon(app)} /> }
              <AppName>{app.name}</AppName>
              {app.spec?.descriptor?.version && <AppVersion>v{app.spec.descriptor.version}</AppVersion>}
              <AppStatus app={app} />
            </AppStatusWrap>
          ))}
        </Div>
      </Card>
    </Layer>
  )
}

export default function AppNav() {
  const [open, setOpen] = useState<boolean>(true)
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
