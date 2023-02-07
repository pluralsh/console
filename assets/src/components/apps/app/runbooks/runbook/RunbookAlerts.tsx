import {
  AppIcon,
  Card,
  CardProps,
  Chip,
  CollapseIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { Collapsible } from 'grommet'
import capitalize from 'lodash/capitalize'
import moment from 'moment'
import { ComponentProps, PropsWithChildren, useState } from 'react'
import styled from 'styled-components'

import { Maybe, RunbookAlertStatus } from 'generated/graphql'

type Annotations =
  | { summary?: Maybe<string>; description?: Maybe<string> }
  | undefined
  | null

const ExpandedItemContent = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  paddingTop: theme.spacing.small,
  paddingBottom: theme.spacing.small,
  paddingLeft: theme.spacing.xsmall,
  paddingRight: theme.spacing.medium,
  color: theme.colors['text-light'],
}))

const ExpandedItemHeading = styled.h6(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  display: 'flex',
  alignItems: 'center',
  margin: 0,
  paddingTop: theme.spacing.small,
  paddingBottom: theme.spacing.small,
  paddingLeft:
    theme.spacing.medium + theme.spacing.xlarge + theme.spacing.small,
  paddingRight: theme.spacing.xsmall,
}))

const ExpandedItemDivider = styled.div.attrs(() => ({ 'aria-hidden': true }))(({ theme }) => ({
  gridColumn: '1 / -1',
  borderBottom: theme.borders['fill-two'],
  ...{ ':last-child': { display: 'none' } },
}))

function ExpandedItem({
  heading,
  children,
}: PropsWithChildren<{
  heading: string
}>) {
  return (
    <>
      <ExpandedItemHeading>{heading}</ExpandedItemHeading>
      <ExpandedItemContent>{children}</ExpandedItemContent>
      <ExpandedItemDivider />
    </>
  )
}

const ChipList = styled.div(({ theme }) => ({
  display: 'flex',
  flexDiretion: 'row',
  flexWrap: 'wrap',
  justifyContent: 'start',
  gap: theme.spacing.xsmall,
}))

const RunbookAlertWrapper = styled.div<{ $isOpen: boolean }>(({ theme, $isOpen }) => ({
  ...{
    ':not(:last-child)': {
      borderBottom: $isOpen
        ? theme.borders['fill-two']
        : theme.borders.default,
      transition: 'border-bottom 0.2s ease-in-out',
    },
  },
  '.trigger': {
    display: 'flex',
    align: 'center',
    color: 'inherit',
    cursor: 'pointer',
    padding: theme.spacing.medium,
    textDecoration: 'none',
    width: '100%',
    ':hover': { backgroundColor: theme.colors['fill-one-hover'] },
    '.info': {
      flexGrow: 1,
      marginLeft: theme.spacing.small,
    },
    '.nameDate': {
      display: 'flex',
      alignItems: 'baseline',
      gap: theme.spacing.xsmall,
    },
    '.name': {
      ...theme.partials.text.body1Bold,
      margin: 0,
    },
    '.date': {
      ...theme.partials.text.caption,
      color: theme.colors['text-xlight'],
      whiteSpace: 'nowrap',
    },
    '.summary': {
      ...theme.partials.text.body2,
      color: theme.colors['text-xlight'],
    },
    '.severity': {
      marginLeft: theme.spacing.xlarge,
      marginRight: theme.spacing.xlarge,
    },
  },
  '.collapsible': {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    backgroundColor: theme.colors['fill-two'],
  },
}))

function AlertSeverity({
  severity,
  ...props
}: { severity: string; className?: string } & ComponentProps<typeof Chip>) {
  return (
    <Chip
      severity={severity}
      {...props}
    >
      {capitalize(severity)}
    </Chip>
  )
}

export default function RunbookAlert({ alert }: { alert: RunbookAlertStatus }) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const {
    name, startsAt, fingerprint, labels,
  } = alert
  const annotations = alert.annotations as Annotations
  const severity
    = (labels
      && 'severity' in labels
      && typeof labels.severity === 'string'
      && labels.severity)
    || null

  return (
    <RunbookAlertWrapper $isOpen={isOpen}>
      <div
        className="trigger"
        onClick={() => setIsOpen(!isOpen)}
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
        <div className="info">
          <div className="nameDate">
            <h5 className="name">{name}</h5>
            <p className="date">
              {moment(startsAt).format('MMM D, YYYY h:mm')}
            </p>
          </div>
          <div className="summary" />
        </div>
        {severity && (
          <AlertSeverity
            className="severity"
            severity={severity}
          />
        )}
        <CollapseIcon
          marginLeft="8px"
          size={8}
          style={
            isOpen
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
      </div>
      <Collapsible
        open={isOpen}
        direction="vertical"
      >
        <div className="collapsible">
          {name && <ExpandedItem heading="name">{name}</ExpandedItem>}
          {annotations?.summary && (
            <ExpandedItem heading="summary">{annotations.summary}</ExpandedItem>
          )}
          {annotations?.description && (
            <ExpandedItem heading="description">
              {annotations.description}
            </ExpandedItem>
          )}

          {labels && (
            <ExpandedItem heading="labels">
              <ChipList>
                {Object.entries(labels).map(([key, val]) => (
                  <Chip>{`${key}: ${val}`}</Chip>
                ))}
              </ChipList>
            </ExpandedItem>
          )}
          {true && (
            <ExpandedItem heading="fingerprint">{fingerprint}</ExpandedItem>
          )}
        </div>
      </Collapsible>
    </RunbookAlertWrapper>
  )
}

export function RunbookAlerts({
  alerts,
  ...props
}: { alerts: RunbookAlertStatus[] } & CardProps) {
  if (!alerts || alerts.length === 0) {
    return null
  }

  return (
    <Card
      flexGrow={1}
      direction="column"
      {...props}
    >
      {alerts.map(alert => (
        <RunbookAlert alert={alert} />
      ))}
    </Card>
  )
}
