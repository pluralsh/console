import { Flex, P } from 'honorable'
import {
  AppIcon,
  ArrowTopRightIcon,
  Button,
  Card,
  ComponentsIcon,
  DashboardIcon,
  GearTrainIcon,
  IdIcon,
  ListBoxItem,
  LogsIcon,
  MoreIcon,
  PeopleIcon,
  RunBookIcon,
  Select,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { ensureURLValidity } from 'utils/url'

import { Readiness } from 'utils/status'

import { ListItemBorder, appState, getIcon, hasIcons } from './misc'
import AppStatus from './AppStatus'

const SHORTCUTS = [
  { url: 'dashboards', label: 'Dashboards', icon: <DashboardIcon /> },
  { url: 'runbooks', label: 'Runbooks', icon: <RunBookIcon /> },
  { url: 'components', label: 'Components', icon: <ComponentsIcon /> },
  { url: 'logs', label: 'Logs', icon: <LogsIcon /> },
  { url: 'cost', label: 'Cost analysis', icon: <IdIcon /> },
  { url: 'oidc', label: 'User management', icon: <PeopleIcon /> },
  { url: 'config', label: 'Configuration', icon: <GearTrainIcon /> },
]

const SHORTCUT_URLS = SHORTCUTS.map((shortcut) => shortcut.url)

const isShortcut = (url) => SHORTCUT_URLS.indexOf(url) > -1

export const getBorderColor = (app) => {
  const { readiness } = appState(app)

  switch (readiness) {
    case Readiness.Failed:
      return 'border-danger'
    case Readiness.InProgress:
      return 'border-warning'
    case Readiness.Ready:
    default:
      return ''
  }
}

const versionName = (vsn: string) => (vsn.startsWith('v') ? vsn : `v${vsn}`)

export default function AppCard({ app }: any) {
  const navigate = useNavigate()

  if (!app?.spec?.descriptor) return null

  const {
    name,
    spec: {
      descriptor: { links, version },
    },
  } = app
  const borderColor = getBorderColor(app)
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <Card
      clickable
      display="flex"
      flexBasis="45%"
      flexGrow={1}
      flexShrink={1}
      minWidth={450}
      className={`app-${name}`}
      onClick={() => navigate(`/apps/${name}`)}
    >
      <ListItemBorder color={borderColor} />
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        padding="small"
      >
        {hasIcons(app) && (
          <AppIcon
            url={getIcon(app)}
            size="xsmall"
          />
        )}
        <Flex direction="column">
          <Flex
            align="center"
            gap="small"
          >
            <P
              body1
              fontWeight={600}
            >
              {name}
            </P>
            <AppStatus app={app} />
          </Flex>
          {version && <Flex>{versionName(version)}</Flex>}
        </Flex>
      </Flex>
      <Flex grow={1} />
      <Flex
        align="center"
        gap="16px"
        padding="small"
      >
        {validLinks?.length > 0 && (
          <Button
            small
            secondary
            as="a"
            href={ensureURLValidity(links[0].url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Launch
          </Button>
        )}
        <Select
          aria-label="shortcuts"
          width="max-content"
          maxHeight={300}
          placement="right"
          triggerButton={
            <Button
              secondary
              small
              paddingHorizontal="xsmall"
            >
              <MoreIcon />
            </Button>
          }
          onSelectionChange={(url) =>
            isShortcut(url)
              ? navigate(`apps/${name}/${url}`)
              : window.open(ensureURLValidity(`${url}`), '_blank')?.focus()
          }
        >
          {validLinks?.length > 1 &&
            validLinks.slice(1).map(({ url }) => (
              <ListBoxItem
                key={`${url}`}
                label={url}
                textValue={`${url}`}
                leftContent={<ArrowTopRightIcon />}
              />
            ))}
          {SHORTCUTS.map(({ url, label, icon }) => (
            <ListBoxItem
              key={url}
              label={label}
              textValue={label}
              leftContent={icon}
            />
          ))}
        </Select>
      </Flex>
    </Card>
  )
}
