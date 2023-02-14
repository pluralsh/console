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
import sortBy from 'lodash/sortBy'
import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Readiness, ReadinessT } from 'utils/status'
import styled, { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import AppStatus from 'components/apps/AppStatus'
import Fuse from 'fuse.js'
import { isEmpty } from 'lodash'
import { useOnClickOutside } from 'components/hooks/useOnClickOutside'
import { Div } from 'honorable'
import { animated, useTransition } from 'react-spring'
import { createPortal } from 'react-dom'

import { useContentOverlay } from './Overlay'

const CARD_WIDTH = 420

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

const AppStatusWrap = styled.div<{ last: boolean }>(({ theme, last = false }) => ({
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

const getTransitionProps = (isOpen: boolean) => ({
  from: { opacity: 0, translateX: `${CARD_WIDTH + 24}px` },
  enter: { opacity: 1, translateX: '0px' },
  leave: { opacity: 0, translateX: `${CARD_WIDTH + 24}px` },
  config: isOpen
    ? {
      mass: 0.6,
      tension: 280,
      velocity: 0.02,
    }
    : {
      mass: 0.6,
      tension: 400,
      velocity: 0.02,
      restVelocity: 0.1,
    },
})

export function StatusPanel({ statuses, open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState<string>('')
  const ref = useRef<any>()
  const theme = useTheme()

  useOnClickOutside(ref, onClose)
  useContentOverlay(open)

  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)

  const apps = useMemo(() => {
    if (isEmpty(query)) return statuses.map(({ app }) => app)

    const fuse = new Fuse<{ app; readiness }>(statuses, searchOptions)

    return fuse.search(query).map(({ item: { app } }) => app)
  }, [query, statuses])

  let content = (
    <Div
      ref={ref}
      position="absolute"
      top={104}
      right={theme.spacing.large}
      bottom={theme.spacing.large}
    >
      <Card
        fillLevel={2}
        width={CARD_WIDTH}
        overflow="auto"
        position="relative"
        height="100%"
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
            {hasIcons(app) && <AppIcon src={getIcon(app)} />}
            <AppName>{app.name}</AppName>
            {app.spec?.descriptor?.version && (
              <AppVersion>v{app.spec.descriptor.version}</AppVersion>
            )}
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
    </Div>
  )

  content = transitions(styles => (
    <animated.div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: theme.zIndexes.modal - 1,
        ...styles,
      }}
    >
      {content}
    </animated.div>
  ))

  return createPortal(content, document.body)
}

export default function AppNav() {
  const [open, setOpen] = useState<boolean>(false)
  const { applications = [] } = useContext<any>(InstallationContext)
  const onClose = useCallback(() => {
    setOpen(false)
  }, [])

  const statuses = useMemo(() => {
    const unsorted = applications.map(app => ({ app, ...appState(app) }))

    return sortBy(unsorted, [
      ({ readiness }) => readinessOrder(readiness),
      'app.name',
    ])
  }, [applications])

  return (
    <>
      <Chip
        backgroundColor={open ? 'fill-one-selected' : 'fill-one'}
        icon={<AppsIcon />}
        clickable
        onClick={() => setOpen(true)}
        size="small"
        userSelect="none"
      >
        Apps
        <StatusIcon readiness={statuses.length > 0 && statuses[0].readiness} />
      </Chip>
      <StatusPanel
        statuses={statuses}
        open={open}
        onClose={onClose}
      />
    </>
  )
}
