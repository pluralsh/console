import { Button, Flex, IconFrame, PlusIcon } from '@pluralsh/design-system'
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
import {
  getWorkbenchCronScheduleCreateAbsPath,
  getWorkbenchWebhookTriggerCreateAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { useNavigate } from 'react-router-dom'

export function WorkbenchSidePanel({ workbenchId }: { workbenchId: string }) {
  const theme = useTheme()
  const navigate = useNavigate()

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

  const hasCrons = crons.length > 0
  const hasWebhooks = webhooks.length > 0

  return (
    <WrapperSC>
      <SectionSC $first>
        <HeaderSC>
          <span>Cron schedules</span>
          {hasCrons && (
            <IconFrame
              clickable
              size="small"
              icon={<PlusIcon />}
              tooltip="Add cron schedule"
              onClick={() =>
                navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
              }
            />
          )}
        </HeaderSC>
        {nextCron && nextRunTimeParts ? (
          <Body2P css={{ lineHeight: '20px' }}>
            <span css={{ color: theme.colors['text-xlight'] }}>next at </span>
            {nextRunTimeParts.datePart}{' '}
            <span css={{ color: theme.colors['code-block-purple'] }}>
              {nextRunTimeParts.hourPart}
            </span>{' '}
            {nextRunTimeParts.zonePart}
          </Body2P>
        ) : nextCron && nextRunTime ? (
          <Body2P css={{ lineHeight: '20px' }}>
            <span css={{ color: theme.colors['text-xlight'] }}>next at </span>
            {nextRunTime}
          </Body2P>
        ) : (
          <Button
            small
            onClick={() =>
              navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
            }
          >
            Add cron schedule
          </Button>
        )}
      </SectionSC>
      <SectionSC>
        <HeaderSC>
          <span>Webhooks</span>
          {hasWebhooks && (
            <IconFrame
              clickable
              size="small"
              icon={<PlusIcon />}
              tooltip="Add webhook"
              onClick={() =>
                navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
              }
            />
          )}
        </HeaderSC>
        {hasWebhooks ? (
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
        ) : (
          <Button
            small
            onClick={() =>
              navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
            }
          >
            Add webhook
          </Button>
        )}
      </SectionSC>
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

const HeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}))
