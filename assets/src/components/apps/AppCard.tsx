import { ThemeContext } from 'grommet'
import { Flex, Span } from 'honorable'
import { AppIcon, Card } from 'pluralsh-design-system'
import { useContext } from 'react'

import AppBorder from './AppBorder'

import AppStatus from './AppStatus'

import { getIcon, hasIcons } from './misc'

export default function AppCard({ application, setCurrentApplication }: any) {
  const { dark }: any = useContext(ThemeContext)

  return (
    <Card
      direction="row"
      clickable
      flexShrink={1}
      flexGrow={1}
      margin="xsmall"
      width="45%"
      minWidth={240}
      onClick={() => setCurrentApplication(application)}
    >
      <AppBorder app={application} />
      <Flex
        align="center"
        gap="small"
        padding="medium"
      >
        {hasIcons(application) && (
          <AppIcon
            url={getIcon(application, dark)}
            size="xsmall"
          />
        )}
        <Span
          body1
          fontWeight={600}
        >
          {application.name}
        </Span>
        <AppStatus application={application} />
      </Flex>
    </Card>
  )
}
