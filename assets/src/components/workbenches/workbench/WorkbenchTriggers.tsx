import { Card, Flex, IconFrame, Prop } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import minBy from 'lodash/minBy'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { formatPreviewTimestamp } from './crons/utils'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './webhooks/utils'
import { mapExistingNodes } from 'utils/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import { isEmpty } from 'lodash'

export function WorkbenchTriggers({ workbenchId }: { workbenchId: string }) {
  const theme = useTheme()

  const { data } = useWorkbenchTriggersSummaryQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
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
  const nextRunTime = useMemo(() => {
    if (!nextCron?.nextRunAt) return null

    const parsed = dayjs(nextCron.nextRunAt)
    if (!parsed.isValid()) return nextCron.nextRunAt

    return parsed.utc().format('YYYY-MM-DD HH:mm:ss [UTC]')
  }, [nextCron])

  const nextRunTimeParts = useMemo(
    () => (nextRunTime ? formatPreviewTimestamp(nextRunTime) : null),
    [nextRunTime]
  )

  if (!nextCron && webhooks.length === 0) return null

  return (
    <Card
      css={{
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.large,
        padding: theme.spacing.medium,
      }}
    >
      {nextCron && (
        <Prop
          title="Cron schedule"
          margin={0}
        >
          {nextRunTimeParts ? (
            <Body2P css={{ lineHeight: '20px' }}>
              <span css={{ color: theme.colors['text-xlight'] }}>next at </span>
              {nextRunTimeParts.datePart}{' '}
              <span css={{ color: theme.colors['code-block-purple'] }}>
                {nextRunTimeParts.hourPart}
              </span>{' '}
              {nextRunTimeParts.zonePart}
            </Body2P>
          ) : nextRunTime ? (
            <Body2P css={{ lineHeight: '20px' }}>
              <span css={{ color: theme.colors['text-xlight'] }}>next at </span>
              {nextRunTime}
            </Body2P>
          ) : null}
        </Prop>
      )}
      {!isEmpty(webhooks) && (
        <Prop
          title="Webhooks"
          margin={0}
        >
          <Flex
            gap="small"
            flexWrap="nowrap"
            width="100%"
          >
            {webhooks.map((webhook) => (
              <Flex
                key={webhook.id}
                gap="xxsmall"
                align="center"
                css={{
                  maxWidth: 120,
                  flex: '0 1 auto',
                }}
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
                <span css={{ ...TRUNCATE }}>{webhook.name}</span>
              </Flex>
            ))}
          </Flex>
        </Prop>
      )}
    </Card>
  )
}
