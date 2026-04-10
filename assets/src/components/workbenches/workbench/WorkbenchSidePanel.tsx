import { AddIcon, Button, Flex, IconFrame } from '@pluralsh/design-system'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import {
  getWorkbenchCronScheduleCreateAbsPath,
  getWorkbenchWebhookTriggerCreateAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { getWebhookIcon } from './webhooks/utils'
import { WorkbenchSidePanelCron } from './WorkbenchSidePanelCron'

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

  const hasCrons = !isEmpty(crons)
  const hasWebhooks = !isEmpty(webhooks)

  return (
    <WrapperSC>
      <SectionSC $first>
        <HeaderSC>
          <span>Webhooks</span>
          {hasWebhooks && (
            <IconFrame
              clickable
              size="small"
              icon={<AddIcon />}
              tooltip="Add webhook"
              onClick={() =>
                navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
              }
            />
          )}
        </HeaderSC>
        {hasWebhooks ? (
          <Flex
            gap="xxsmall"
            direction="column"
          >
            {webhooks.map((webhook) => (
              <Flex
                key={webhook.id}
                gap="xsmall"
                align="center"
              >
                <IconFrame
                  icon={getWebhookIcon(webhook)}
                  size="xsmall"
                />
                <span css={{ ...TRUNCATE, color: theme.colors['text-light'] }}>
                  {webhook.name}
                </span>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Button
            small
            startIcon={<AddIcon />}
            tertiary
            onClick={() =>
              navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
            }
          >
            Add webhook
          </Button>
        )}
      </SectionSC>
      <SectionSC>
        <HeaderSC>
          <span>Cron schedules</span>
          {hasCrons && (
            <IconFrame
              clickable
              size="small"
              icon={<AddIcon />}
              tooltip="Add cron schedule"
              onClick={() =>
                navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
              }
            />
          )}
        </HeaderSC>
        {hasCrons ? (
          <Flex
            gap="medium"
            flexWrap="nowrap"
            width="100%"
            direction="column"
          >
            {crons.map((cron) => (
              <WorkbenchSidePanelCron
                key={cron.id}
                cron={cron}
              />
            ))}
          </Flex>
        ) : (
          <Button
            small
            startIcon={<AddIcon />}
            tertiary
            onClick={() =>
              navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
            }
          >
            Add cron schedule
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
  minHeight: 0,
  minWidth: 250,
  maxWidth: 250,
  overflowX: 'hidden',
  overflowY: 'auto',
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
