import { AppIcon } from '@pluralsh/design-system'
import { getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { Div, Flex, P } from 'honorable'
import moment from 'moment'
import { useContext, useMemo } from 'react'

import NotificationSeverity from './NotificationSeverity'

export default function Notification({ notification, _closePanel }: any) {
  const { applications } = useContext<any>(InstallationContext)
  const app = useMemo(() => applications.find(({ name }) => name === notification.repository), [applications, notification])
  const { title, severity, seenAt } = notification

  return (
    <Flex
      align="center"
      borderBottom="1px solid border"
      color="inherit"
      textDecoration="none"
      padding="medium"
      gap="small"
      width="100%"
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
    </Flex>
  )
}

