import { AppIcon, Button, CollapseIcon } from '@pluralsh/design-system'
import { getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { Collapsible } from 'grommet'
import { Div, Flex, P } from 'honorable'
import moment from 'moment'
import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import NotificationSeverity from './NotificationSeverity'

export default function Notification({ notification, closePanel }: any) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)
  const { applications } = useContext<any>(InstallationContext)
  const app = useMemo(() => applications.find(({ name }) => name === notification.repository),
    [applications, notification])
  const {
    title, description, severity, seenAt,
  } = notification

  return (
    <>
      <Flex
        align="center"
        borderBottom="1px solid border"
        color="inherit"
        cursor="pointer"
        gap="small"
        onClick={() => setOpen(!open)}
        padding="medium"
        textDecoration="none"
        width="100%"
        _hover={{ backgroundColor: 'fill-one-hover' }}
      >
        {hasIcons(app) && (
          <AppIcon
            url={getIcon(app)}
            hue="lighter"
            size="xxsmall"
          />
        )}
        <Div>
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
        </Div>
        <Flex grow={1} />
        <NotificationSeverity severity={severity} />
        <CollapseIcon
          marginLeft="8px"
          size={8}
          style={open ? {
            transform: 'rotate(270deg)',
            transitionDuration: '.2s',
            transitionProperty: 'transform',
          } : {
            transform: 'rotate(180deg)',
            transitionDuration: '.2s',
            transitionProperty: 'transform',
          }}
        />
      </Flex>
      <Collapsible
        open={open}
        direction="vertical"
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
          >
            {description}
          </P>
          <div>
            <Button
              fontWeight={600}
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
      </Collapsible>
    </>
  )
}

