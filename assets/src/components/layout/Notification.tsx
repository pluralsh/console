import {
  Accordion,
  AccordionItem,
  AppIcon,
  Button,
} from '@pluralsh/design-system'
import { getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { Flex, P } from 'honorable'
import moment from 'moment'
import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import NotificationSeverity from './NotificationSeverity'

export default function Notification({ notification, closePanel }: any) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { applications } = useContext<any>(InstallationContext)
  const app = useMemo(
    () => applications.find(({ name }) => name === notification.repository),
    [applications, notification]
  )
  const { title, description, severity, seenAt } = notification

  return (
    <Accordion type="single">
      <AccordionItem
        css={{ borderTop: theme.borders.default }}
        paddingArea="trigger-only"
        trigger={
          <Flex
            align="center"
            color="inherit"
            cursor="pointer"
            gap="small"
            width="100%"
            marginRight={theme.spacing.small}
          >
            {hasIcons(app) && (
              <AppIcon
                url={getIcon(app, theme.mode)}
                hue="lighter"
                size="xxsmall"
              />
            )}
            <div>
              <P
                body2
                fontWeight={600}
              >
                {title}
              </P>
              <P
                caption
                color="text-xlight"
                whiteSpace="nowrap"
              >
                {moment(seenAt).format('MMM D, h:mm')}
              </P>
            </div>
            <Flex grow={1} />
            <NotificationSeverity severity={severity} />
          </Flex>
        }
      >
        <Flex
          backgroundColor="fill-zero"
          borderBottom="1px solid border"
          direction="column"
          gap="medium"
          padding="medium"
          paddingLeft={60}
        >
          <P
            body2
            color="text-light"
            wordBreak="break-word"
          >
            {description}
          </P>
          <div>
            <Button
              onClick={() => {
                closePanel()
                navigate(`/apps/${app.name}`)
              }}
              secondary
            >
              Go to {app.name}
            </Button>
          </div>
        </Flex>
      </AccordionItem>
    </Accordion>
  )
}
