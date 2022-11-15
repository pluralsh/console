import { ThemeContext } from 'grommet'
import { Div, Flex, P } from 'honorable'
import {
  AppIcon,
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
} from 'pluralsh-design-system'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import AppBorder from './AppBorder'

import AppStatus from './misc/AppStatus'

import { getIcon, hasIcons } from './misc'

export default function AppCard({ application, setCurrentApplication }: any) {
  const navigate = useNavigate()
  const { dark }: any = useContext(ThemeContext)

  if (!application?.spec?.descriptor) return null

  const { name, spec: { descriptor: { links, version } } } = application

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
        navigate(`/app/${application.name}`)
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
      <Flex direction="column">
        {links?.map(({ description, url }) => <Div key={url}>{url} - {description}</Div>)}
      </Flex>
      {/* TODO: Export to the new component. */}
      <Select
        width="max-content"
        placement="right"
        triggerButton={(
          <Button
            secondary
            small
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
            }}
          ><MoreIcon />
          </Button>
        )}
      >
        <ListBoxItem
          label="Dashboard"
          textValue="dashboard"
          leftContent={<DashboardIcon />}
        />
        <ListBoxItem
          label="Runbooks"
          textValue="runbooks"
          leftContent={<RunBookIcon />}
        />
        <ListBoxItem
          label="Components"
          textValue="components"
          leftContent={<ComponentsIcon />}
        />
        <ListBoxItem
          label="Logs"
          textValue="logs"
          leftContent={<LogsIcon />}
        />
        <ListBoxItem
          label="Cost analysis"
          textValue="costanalysis"
          leftContent={<IdIcon />}
        />
        <ListBoxItem
          label="Configuration"
          textValue="config"
          leftContent={<GearTrainIcon />}
        />
      </Select>
    </Card>
  )
}
