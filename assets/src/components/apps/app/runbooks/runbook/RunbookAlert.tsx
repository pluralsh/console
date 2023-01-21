import { AppIcon, CollapseIcon, WarningIcon } from '@pluralsh/design-system'
import { Maybe, RunbookAlertStatus } from 'generated/graphql'
import { Collapsible } from 'grommet'
import {
  Div,
  Flex,
  H6,
  P,
} from 'honorable'
import moment from 'moment'
import { PropsWithChildren, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

type Annotations =
  | { summary?: Maybe<string>; description?: Maybe<string> }
  | undefined
  | null

function ExpandedItem({
  heading, children,
}: PropsWithChildren<{
  heading: string
}>) {
  const theme = useTheme()

  return (
    <>
      <H6
        body1
        bold
        paddingTop="small"
        paddingBottom="small"
        paddingLeft={60}
        paddingRight="xsmall"
      >{heading}
      </H6>
      <Div
        body2
        paddingTop="small"
        paddingBottom="small"
        paddingLeft="xsmall"
        paddingRight="medium"
        color="text-light"
      >{children}
      </Div>
      <Div
        gridColumn="1 / -1"
        borderBottom={theme.borders['fill-two']}
        {...{ ':last-child': { display: 'none' } }}
      />
    </>
  )
}

export default function RunbookAlert({ alert }: { alert: RunbookAlertStatus }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)

  const {
    name, startsAt, fingerprint, labels,
  } = alert
  const annotations = alert.annotations as Annotations
  const theme = useTheme()

  return (
    <>
      <Flex
        align="center"
        color="inherit"
        cursor="pointer"
        gap="small"
        onClick={() => setOpen(!open)}
        padding="medium"
        textDecoration="none"
        width="100%"
        _hover={{ backgroundColor: 'fill-one-hover' }}
        {...{
          ':not(:last-child)': {
            borderBottom: theme.borders.default,
          },
        }}
      >
        <AppIcon
          icon={(
            <WarningIcon
              size={16}
              color="icon-warning"
            />
          )}
          hue="lighter"
          size="xxsmall"
        />
        <Div>
          <P
            body2
            fontWeight={600}
          >
            {name}
          </P>
          <P
            caption
            color="text-xlight"
            whiteSpace="nowrap"
          >
            {moment(startsAt).format('MMM D, YYYY h:mm')}
          </P>
        </Div>
        <Flex grow={1} />
        {/* <NotificationSeverity severity={severity} /> */}
        <CollapseIcon
          marginLeft="8px"
          size={8}
          style={
            open
              ? {
                transform: 'rotate(270deg)',
                transitionDuration: '.2s',
                transitionProperty: 'transform',
              }
              : {
                transform: 'rotate(180deg)',
                transitionDuration: '.2s',
                transitionProperty: 'transform',
              }
          }
        />
      </Flex>
      <Collapsible
        open={open}
        direction="vertical"
      >
        <Flex
          backgroundColor="fill-zero"
          direction="column"
        >
          <Div
            display="grid"
            gridTemplateColumns="1fr 1fr"
            backgroundColor="fill-two"
          >
            {name && (
              <ExpandedItem heading="name">{name}</ExpandedItem>
            )}
            {annotations?.summary && (
              <ExpandedItem heading="summary">{annotations.summary}</ExpandedItem>
            )}
            {annotations?.description && (
              <ExpandedItem heading="description">{annotations.description}</ExpandedItem>
            )}

            {labels && (
              <ExpandedItem heading="labels">placeholder</ExpandedItem>
            )}
          </Div>

        </Flex>
      </Collapsible>
    </>
  )
}
