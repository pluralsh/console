import { ThemeContext } from 'grommet'
import { Flex, P } from 'honorable'
import { AppIcon, Card } from 'pluralsh-design-system'
import { useContext } from 'react'

import AppBorder from './AppBorder'

import AppStatus from './AppStatus'

import { getIcon, hasIcons } from './misc'

export default function AppCard({ application, setCurrentApplication }: any) {
  const { dark }: any = useContext(ThemeContext)

  return (
    <Card
      alignItems="top"
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
        display="inline-flex"
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
        <P
          body1
          fontWeight={600}
        >
          {application.name}
        </P>
        <AppStatus application={application} />
      </Flex>
    </Card>
  )
}
