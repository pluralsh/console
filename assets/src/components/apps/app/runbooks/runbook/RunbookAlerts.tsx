import { Flex, P } from 'honorable'

import { RunbookAlertStatus } from 'generated/graphql'

import { Card, CardProps } from '@pluralsh/design-system'

import RunbookAlert from './RunbookAlert'

export function RunbookAlerts({ alerts, ...props }: { alerts: RunbookAlertStatus[] } & CardProps) {
  if (!alerts || alerts.length === 0) {
    return <P padding="medium">No alerts available.</P>
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
