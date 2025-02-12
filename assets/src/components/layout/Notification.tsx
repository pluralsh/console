import { Accordion, AccordionItem } from '@pluralsh/design-system'
import { Flex, P } from 'honorable'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

import NotificationSeverity from './NotificationSeverity'

export default function Notification({ notification }: any) {
  const theme = useTheme()
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
                {formatDateTime(seenAt, 'MMM D, h:mm')}
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
        </Flex>
      </AccordionItem>
    </Accordion>
  )
}
