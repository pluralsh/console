import { Flex, IconFrame } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import minBy from 'lodash/minBy'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'
import { formatPreviewTimestamp } from './crons/utils'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from './webhooks/utils'
import { mapExistingNodes } from 'utils/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import { isEmpty } from 'lodash'

export function WorkbenchSidePanel({ workbenchId }: { workbenchId: string }) {
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
    <WrapperSC>
      {nextCron && (
        <SectionSC $first>
          <HeaderSC>Cron schedules</HeaderSC>
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
        </SectionSC>
      )}
      {!isEmpty(webhooks) && (
        <SectionSC>
          <HeaderSC>Webhooks</HeaderSC>
          <Flex
            gap="small"
            flexWrap="nowrap"
            width="100%"
            direction="column"
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
        </SectionSC>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  borderRight: theme.borders['fill-one'],
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  gap: theme.spacing.large,
  minWidth: 250,
  maxWidth: 250,
  padding: theme.spacing.medium,
}))

const SectionSC = styled.div<{ $first?: boolean }>(({ theme, $first }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,

  ...(!$first && {
    borderTop: theme.borders['fill-one'],
    paddingTop: theme.spacing.medium,
  }),
}))

const HeaderSC = styled.p(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))
