import { ThemeContext } from 'grommet'
import { Div, Flex, P } from 'honorable'
import {
  AppIcon,
  Button,
  Card,
  MoreIcon,
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
      <Button
        secondary
        small
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
        }}
      ><MoreIcon />
      </Button>
    </Card>
  )
}
