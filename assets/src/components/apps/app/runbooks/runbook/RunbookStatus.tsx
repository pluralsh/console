import { Chip, Tooltip, WarningIcon } from '@pluralsh/design-system'
import { Maybe, Runbook, RunbookAlertStatus } from 'generated/graphql'
import { Flex, Span } from 'honorable'
import moment from 'moment'
import { useTheme } from 'styled-components'

import { hasAlerts } from '../misc'

function AlertsTooltipLabel({
  alerts,
}: {
  alerts: Maybe<Maybe<RunbookAlertStatus>[]>
}) {
  const theme = useTheme()

  if (!alerts || alerts.length === 0) {
    return null
  }
  const DATE_PATTERN = 'MMM D, YYYY h:mm a'

  return (
    <Flex
      whiteSpace="nowrap"
      flexDirection="column"
    >
      {alerts?.map((alert, i) => {
        const dateTime = moment(alert?.startsAt).format(DATE_PATTERN)

        return (
          alert && (
            <Flex
              padding="medium"
              gap="small"
              size={16}
              {...{
                ':not(:last-child)': {
                  borderBottom: theme.borders['fill-two'],
                },
              }}
            >
              <div css={{ paddingTop: 2 }}>
                <WarningIcon color={theme.colors['icon-warning']} />
              </div>
              <Flex
                key={i}
                flexDirection="column"
                flexGrow={1}
                gap="xxsmall"
              >
                <Flex
                  gap="small"
                  alignItems="baseline"
                >
                  <div
                    css={{
                      ...theme.partials.text.body2,
                      fontWeight: 'bold',
                      flexGrow: 1,
                    }}
                  >
                    {alert.name}
                  </div>
                  <div
                    css={{
                      ...theme.partials.text.overline,
                      color: 'text-xlight',
                    }}
                  >
                    {dateTime}
                  </div>
                </Flex>
                {alert.annotations && (
                  <div
                    css={{ ...theme.partials.text.body2, color: 'text-xlight' }}
                  >
                    {(alert?.annotations as any)?.summary}
                  </div>
                )}
              </Flex>
            </Flex>
          )
        )
      })}
    </Flex>
  )
}

export default function RunbookStatus({ runbook, fontWeight = 400 }) {
  const rBook = runbook as Runbook
  const alerts = rBook.status?.alerts

  if (hasAlerts(runbook)) {
    return (
      <Tooltip
        paddingTop="0"
        paddingBottom="0"
        paddingRight="0"
        paddingLeft="0"
        label={<AlertsTooltipLabel alerts={alerts || []} />}
      >
        <Chip
          icon={<WarningIcon />}
          size="small"
          severity="warning"
          userSelect="none"
        >
          <Span fontWeight={fontWeight}>Alert</Span>
        </Chip>
      </Tooltip>
    )
  }

  return (
    <Chip
      size="small"
      severity="success"
    >
      <Span fontWeight={fontWeight}>Healthy</Span>
    </Chip>
  )
}
