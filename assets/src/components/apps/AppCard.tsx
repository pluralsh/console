import { ThemeContext } from 'grommet'
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
  RunBookIcon,
  Select,
} from '@pluralsh/design-system'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { toAbsoluteURL } from 'utils/url'

import AppBorder from './AppBorder'

import AppStatus from './AppStatus'

import { getIcon, hasIcons } from './misc'

const SHORTCUTS = [
  { url: 'dashboards', label: 'Dashboards', icon: <DashboardIcon /> },
  { url: 'runbooks', label: 'Runbooks', icon: <RunBookIcon /> },
  { url: 'components', label: 'Components', icon: <ComponentsIcon /> },
  { url: 'logs', label: 'Logs', icon: <LogsIcon /> },
  { url: 'cost', label: 'Cost analysis', icon: <IdIcon /> },
  { url: 'config', label: 'Configuration', icon: <GearTrainIcon /> },
]

const SHORTCUT_URLS = SHORTCUTS.map(shortcut => shortcut.url)

const isShortcut = url => SHORTCUT_URLS.indexOf(url) > -1

export default function AppCard({ application, setCurrentApplication }: any) {
  const navigate = useNavigate()
  const { dark }: any = useContext(ThemeContext)

  if (!application?.spec?.descriptor) return null

  const { name, spec: { descriptor: { links, version } } } = application
  const validLinks = links?.filter(({ url }) => !!url)

  return (
    <Card
      clickable
      display="flex"
      flexBasis="40%"
      flexGrow={1}
      flexShrink={1}
      margin="xsmall"
      minWidth={240}
      onClick={() => {
        setCurrentApplication(application) // TODO: Consider removing this context.
        navigate(`/apps/${application.name}`)
      }}
    >
      <AppBorder app={application} />
      <Flex
        align="center"
        gap="small"
        maxWidth="90%"
        padding="medium"
      >
        {hasIcons(application) && (
          <AppIcon
            url={getIcon(application, dark)}
            size="xsmall"
          />
        )}
        <Flex direction="column">
          <Flex gap="small">
            <P
              body1
              fontWeight={600}
            >
              {name}
            </P>
            <AppStatus application={application} />
          </Flex>
          {version && <Flex>v{version}</Flex>}
        </Flex>
      </Flex>
      <Flex grow={1} />
      <Flex
        align="center"
        gap="16px"
        padding="medium"
      >
        {validLinks?.length > 0 && (
          <Button
            small
            secondary
            fontWeight={600}
            endIcon={<ArrowTopRightIcon size={14} />}
            as="a"
            href={toAbsoluteURL(links[0].url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            Launch
          </Button>
        )}
        <Select
          aria-label="shortcuts"
          width="max-content"
          maxHeight={300}
          placement="right"
          triggerButton={(
            <Button
              secondary
              small
              paddingHorizontal="xsmall"
            >
              <MoreIcon />
            </Button>
          )}
          onSelectionChange={url => {
            setCurrentApplication(application)
            if (isShortcut(url)) navigate(`apps/${application.name}/${url}`)
            else window.open(toAbsoluteURL(`${url}`), '_blank')?.focus()
          }}
        >
          {validLinks?.length > 1 && validLinks.slice(1).map(({ url }) => (
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
