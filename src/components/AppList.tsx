import styled from 'styled-components'
import {
  type Dispatch,
  type ReactNode,
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isEmpty } from 'lodash-es'

import { MoreIcon, SearchIcon } from '../icons'

import AppIcon from './AppIcon'
import Button from './Button'
import Card, { type CardProps } from './Card'
import Input from './Input'
import { ListBoxItem } from './ListBoxItem'
import { Select } from './Select'
import Tooltip from './Tooltip'
import { useWindowSize } from './wizard/hooks'
import WrapWithIf from './WrapWithIf'

const AppList = styled(AppListUnstyled)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  isolation: 'isolate',

  '.app-grid': {
    display: 'grid',
    rowGap: theme.spacing.medium,
    padding: theme.spacing.xxxsmall,
    minHeight: '200px',
    maxHeight: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',

    '.promoted:not(:has(~ .promoted))': {
      marginBottom: theme.spacing.medium,
    },

    '&.scrollable': {
      paddingRight: '8px',
    },

    '.empty': {
      display: 'flex',
      alignItems: 'center',
      justifyItems: 'center',
      flexDirection: 'column',
      gap: theme.spacing.small,

      '.empty-message': {
        ...theme.partials.text.body2,
        color: theme.colors['text-light'],
      },
    },
  },
}))

interface AppListProps {
  apps: Array<AppProps>
  onFilter?: Dispatch<string>
}

function AppListUnstyled({
  apps,
  onFilter,
  ...props
}: AppListProps): JSX.Element {
  const size = useWindowSize()
  const scrollRef = createRef<HTMLDivElement>()

  const [filter, setFilter] = useState<string>()
  const [scrollable, setScrollable] = useState(false)

  const isScrollbarVisible = (el: HTMLDivElement) =>
    el?.scrollHeight > el?.clientHeight
  const sortByPriority = useCallback((first: AppProps, second: AppProps) => {
    // Surface promoted apps first
    if (first.promoted) return -1
    if (second.promoted) return 1

    // Surface apps with primary action defined second
    if (first.primaryAction) return -1
    if (second.primaryAction) return 1

    // Leave the rest as is
    return 0
  }, [])
  const filterByName = useCallback(
    (app: AppProps) =>
      filter ? app.name.toLowerCase().includes(filter?.toLowerCase()) : true,
    [filter]
  )

  const filteredApps = useMemo(
    () => (onFilter ? apps : apps.filter(filterByName)),
    [apps, filterByName, onFilter]
  )

  useEffect(() => {
    if (!scrollRef.current) return

    setScrollable(isScrollbarVisible(scrollRef.current))
  }, [scrollRef, size])

  return (
    <div {...props}>
      {!isEmpty(apps) && (
        <div>
          <Input
            prefix={<SearchIcon />}
            placeholder="Filter applications"
            value={filter}
            onChange={({ target: { value } }) => setFilter(value)}
          />
        </div>
      )}

      <div
        className={scrollable ? 'app-grid scrollable' : 'app-grid'}
        ref={scrollRef}
      >
        {filteredApps.sort(sortByPriority).map((app) => (
          <App
            key={app.name}
            className={app.promoted ? 'promoted' : undefined}
            promoted={app.promoted}
            name={app.name}
            description={app.description}
            logoUrl={app.logoUrl}
            icon={app.icon}
            primaryAction={app.primaryAction}
            actions={app.actions}
            {...app}
          />
        ))}

        {isEmpty(filteredApps) && !isEmpty(filter) && (
          <div className="empty">
            <span className="empty-message">
              No applications found for "{filter}".
            </span>
            <Button
              secondary
              onClick={() => setFilter('')}
            >
              Clear search
            </Button>
          </div>
        )}

        {isEmpty(apps) && (
          <div className="empty">
            <span className="empty-message">No applications found.</span>
          </div>
        )}
      </div>
    </div>
  )
}

const App = styled(AppUnstyled)(({ theme }) => ({
  '&&': {
    display: 'flex',
    gap: theme.spacing.small,
    padding: theme.spacing.medium,
    maxHeight: '80px',
    minHeight: '80px',
    minWidth: 0,
  },
  '&.promoted': {
    position: 'relative',
    border: 'none !important',
    borderRadius: theme.borderRadiuses.large - 1,

    '&::after': {
      '--border-width': '1px',
      '--border-angle': '0deg',
      '--color-1': 'rgba(69, 73, 84, .8)',
      '--color-2': 'rgba(73, 79, 242, .8)',
      '--color-3': 'rgba(92, 119, 255, .8)',

      content: '""',
      position: 'absolute',
      top: 'calc(-1 * var(--border-width))',
      right: 'calc(-1 * var(--border-width))',
      bottom: 'calc(-1 * var(--border-width))',
      left: 'calc(-1 * var(--border-width))',

      backgroundImage: `conic-gradient(from var(--border-angle),
        var(--color-1) 0deg,
        var(--color-1) 1deg,
        var(--color-2), 
        var(--color-3),
        var(--color-1) 359deg)
      `,
      borderRadius: theme.borderRadiuses.large,
      boxShadow: theme.boxShadows.slight,

      zIndex: -1,
      animation: 'ease-border 4s infinite linear',
    },

    '@property --border-angle': {
      syntax: '"<angle>"',
      inherits: 'false',
      initialValue: '0deg',
    },

    '@keyframes ease-border': {
      '0%': { '--border-angle': '0deg' },
      '20%': { '--border-angle': '75deg' },
      '35%': { '--border-angle': '110deg' },
      '65%': { '--border-angle': '250deg' },
      '80%': { '--border-angle': '285deg' },
      '100%': { '--border-angle': '360deg' },
    },
  },

  '.text-container': {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    gap: theme.spacing.xxsmall,
    overflow: 'hidden',

    '& > .title': {
      ...theme.partials.text.body1Bold,
    },

    '& > .description': {
      ...theme.partials.text.body2,
      color: theme.colors['text-light'],
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
  },

  '.primary-action': {
    display: 'flex',
    alignItems: 'center',
  },

  '.actions': {
    display: 'flex',
    alignItems: 'center',
  },
}))

type AppProps = {
  logoUrl?: string
  icon?: JSX.Element
  name: string
  description: string
  primaryAction?: JSX.Element
  actions?: Array<AppMenuAction>
  promoted?: boolean
  isAlive?: boolean
} & CardProps

interface AppMenuAction {
  label: string
  onSelect: Dispatch<void>
  leftContent?: ReactNode
  rightContent?: ReactNode
  destructive?: boolean
}

function AppUnstyled({
  logoUrl,
  icon,
  name,
  description,
  primaryAction,
  actions,
  isAlive,
  ...props
}: AppProps): JSX.Element {
  return (
    <Card {...props}>
      <AppIcon
        name={name}
        url={logoUrl}
        icon={icon}
        size="xsmall"
      />
      <div className="text-container">
        <div className="title">{name}</div>
        <div
          className="description"
          title={description}
        >
          {description}
        </div>
      </div>

      {primaryAction && <div className="primary-action">{primaryAction}</div>}

      {actions && (
        <div className="actions">
          <WrapWithIf
            condition={!isAlive}
            wrapper={<Tooltip label="Application not ready" />}
          >
            <div>
              <Select
                aria-label="moreMenu"
                selectedKey={null}
                onSelectionChange={(key: any) =>
                  actions.find((action) => action.label === key)?.onSelect()
                }
                isDisabled={!isAlive}
                width="max-content"
                maxHeight={197}
                triggerButton={
                  <Button
                    secondary
                    width={32}
                    minHeight={32}
                  >
                    <MoreIcon />
                  </Button>
                }
              >
                {actions.map((action) => (
                  <ListBoxItem
                    key={action.label}
                    label={action.label}
                    textValue={action.label}
                    leftContent={action.leftContent}
                    rightContent={action.rightContent}
                    destructive={action.destructive}
                  />
                ))}
              </Select>
            </div>
          </WrapWithIf>
        </div>
      )}
    </Card>
  )
}

export type { AppProps, AppListProps, AppMenuAction }
export { AppList }
