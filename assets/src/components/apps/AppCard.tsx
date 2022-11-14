import { ThemeContext } from 'grommet'
import { Flex, P } from 'honorable'
import { AppIcon, Card } from 'pluralsh-design-system'
import { useContext } from 'react'

import AppBorder from './AppBorder'

import AppStatus from './AppStatus'

import { getIcon, hasIcons } from './misc'

export default function AppCard({ application, setCurrentApplication }: any) {
  const { dark }: any = useContext(ThemeContext)
  const version = application?.spec?.descriptor?.version

  return (
    <Card
      clickable
      display="flex"
      flexBasis="40%"
      flexGrow={1}
      flexShrink={1}
      margin="xsmall"
      minWidth={240}
      onClick={() => setCurrentApplication(application)}
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
              {application.name}
            </P>
            <AppStatus application={application} />
          </Flex>
          {version && <Flex>v{version}</Flex>}
        </Flex>
      </Flex>
    </Card>
  )
}
