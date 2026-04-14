import {
  AddIcon,
  Button,
  Flex,
  IconFrame,
  PencilIcon,
} from '@pluralsh/design-system'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { PropsWithChildren, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { TRUNCATE } from 'components/utils/truncate'
import {
  getWorkbenchCronScheduleCreateAbsPath,
  getWorkbenchWebhookTriggerCreateAbsPath,
  getWorkbenchWebhookTriggerEditAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { getWebhookIcon } from './webhooks/utils'
import { WorkbenchToolIcon } from '../tools/workbenchToolsUtils'
import { WorkbenchSidePanelCron } from './WorkbenchSidePanelCron'

export function WorkbenchSidePanel({
  workbenchId,
  onOpenToolsEdit,
}: {
  workbenchId: string
  onOpenToolsEdit: () => void
}) {
  const navigate = useNavigate()

  const { data } = useWorkbenchTriggersSummaryQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const workbench = data?.workbench
  const tools = useMemo(
    () =>
      (workbench?.tools ?? []).filter((t): t is NonNullable<typeof t> => !!t),
    [workbench]
  )
  const crons = useMemo(() => mapExistingNodes(workbench?.crons), [workbench])
  const webhooks = useMemo(
    () => mapExistingNodes(workbench?.webhooks),
    [workbench]
  )

  const hasTools = !isEmpty(tools)
  const hasCrons = !isEmpty(crons)
  const hasWebhooks = !isEmpty(webhooks)

  return (
    <WrapperSC>
      <SectionSC $first>
        <HeaderSC>
          <span>Tools</span>
          <IconFrame
            clickable
            size="small"
            icon={<AddIcon size={12} />}
            tooltip="Add or remove tools"
            onClick={onOpenToolsEdit}
          />
        </HeaderSC>
        {hasTools ? (
          <Flex
            gap="xxsmall"
            direction="column"
          >
            {tools.map((tool) => (
              <Flex
                key={tool.id}
                gap="xsmall"
                align="center"
              >
                <ItemIconContainerSC>
                  <IconFrame
                    icon={<WorkbenchToolIcon type={tool.tool} />}
                    size="xsmall"
                  />
                </ItemIconContainerSC>
                <ItemNameSC>{tool.name}</ItemNameSC>
              </Flex>
            ))}
          </Flex>
        ) : (
          <ButtonSC
            small
            startIcon={<AddIcon size={12} />}
            tertiary
            onClick={onOpenToolsEdit}
          >
            Add tools
          </ButtonSC>
        )}
      </SectionSC>
      <SectionSC>
        <HeaderSC>
          <span>Webhooks</span>
          {hasWebhooks && (
            <IconFrame
              clickable
              size="small"
              icon={<AddIcon size={12} />}
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
              <WorkbenchSidePanelEditRow
                key={webhook.id}
                onClick={() =>
                  navigate(
                    getWorkbenchWebhookTriggerEditAbsPath({
                      workbenchId,
                      webhookId: webhook.id,
                    })
                  )
                }
              >
                <ItemIconContainerSC>
                  <IconFrame
                    icon={getWebhookIcon(webhook)}
                    size="xsmall"
                  />
                </ItemIconContainerSC>
                <ItemNameSC>{webhook.name}</ItemNameSC>
              </WorkbenchSidePanelEditRow>
            ))}
          </Flex>
        ) : (
          <ButtonSC
            small
            startIcon={<AddIcon size={12} />}
            tertiary
            onClick={() =>
              navigate(getWorkbenchWebhookTriggerCreateAbsPath(workbenchId))
            }
          >
            Add webhook
          </ButtonSC>
        )}
      </SectionSC>
      <SectionSC>
        <HeaderSC>
          <span>Cron schedules</span>
          {hasCrons && (
            <IconFrame
              clickable
              size="small"
              icon={<AddIcon size={12} />}
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
                workbenchId={workbenchId}
              />
            ))}
          </Flex>
        ) : (
          <ButtonSC
            small
            startIcon={<AddIcon size={12} />}
            tertiary
            onClick={() =>
              navigate(getWorkbenchCronScheduleCreateAbsPath(workbenchId))
            }
          >
            Add cron schedule
          </ButtonSC>
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

const ButtonSC = styled(Button)(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  alignSelf: 'start',
  color: theme.colors['text-xlight'],
  padding: 0,

  '&:hover': {
    ...theme.partials.reset.button,
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))

const ItemIconContainerSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
})

const ItemNameSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  color: theme.colors['text-light'],
  flex: 1,
  minWidth: 0,
}))

export function WorkbenchSidePanelEditRow({
  onClick,
  children,
}: PropsWithChildren<{
  onClick: () => void
}>) {
  return (
    <EditRowButtonSC
      type="button"
      onClick={onClick}
    >
      {children}
      <Flex
        className="icon-container"
        alignItems="center"
        justifyContent="center"
        height={24}
        width={24}
      >
        <PencilIcon size={12} />
      </Flex>
    </EditRowButtonSC>
  )
}

const EditRowButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xsmall,

  '& > .icon-container': {
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },

  '&:hover > *': {
    color: theme.colors.text,
  },

  '&:hover > .icon-container': {
    opacity: 1,
  },
}))
