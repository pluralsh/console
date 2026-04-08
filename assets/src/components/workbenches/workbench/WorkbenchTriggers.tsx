import { Card, Chip, Flex, IconFrame, Prop } from '@pluralsh/design-system'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import minBy from 'lodash/minBy'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { cronToExplanation } from './crons/utils'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './webhooks/utils'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchTriggers({ workbenchId }: { workbenchId: string }) {
  const theme = useTheme()

  const { data } = useWorkbenchTriggersSummaryQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })

  const workbench = data?.workbench
  const crons = useMemo(() => mapExistingNodes(workbench?.crons), [workbench])
  const webhooks = useMemo(
    () => mapExistingNodes(workbench?.webhooks),
    [workbench]
  )

  // TODO: Do it on the server-side to avoid bug when there is more than one page of crons.
  const nextCron = useMemo(
    () =>
      minBy(crons, (cron) => {
        const nextRunAt = cron.nextRunAt ? Date.parse(cron.nextRunAt) : NaN

        return Number.isFinite(nextRunAt) ? nextRunAt : Number.POSITIVE_INFINITY
      }) ?? null,
    [crons]
  )

  if (!nextCron && webhooks.length === 0) return null

  return (
    <Card
      css={{
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.medium,
        padding: theme.spacing.medium,
      }}
    >
      {nextCron && (
        <Prop
          title="Cron schedule"
          margin={0}
        >
          {cronToExplanation(nextCron)}
        </Prop>
      )}
      {webhooks.length > 0 && (
        <Prop
          title="Webhooks"
          margin={0}
          overflow="hidden"
        >
          <Flex
            gap="small"
            flexWrap="nowrap"
            overflow="hidden"
          >
            {webhooks.map((webhook) => (
              <Flex
                key={webhook.id}
                gap="xxxsmall"
              >
                <IconFrame
                  icon={
                    webhook.issueWebhook
                      ? getIssueWebhookProviderIcon(
                          webhook.issueWebhook.provider
                        )
                      : getObservabilityWebhookTypeIcon(webhook.webhook?.type)
                  }
                  size="xsmall"
                />
                {webhook.name ||
                  webhook.webhook?.name ||
                  webhook.issueWebhook?.name ||
                  'Webhook trigger'}
              </Flex>
            ))}
          </Flex>
        </Prop>
      )}
    </Card>
  )
}
