import { Button, Card, EmptyState, Flex } from '@pluralsh/design-system'
import { Body2BoldP } from 'components/utils/typography/Text'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
  WORKBENCHES_TRIGGERS_REL_PATH,
  WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH,
  WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

const OuterCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  gap: theme.spacing.small,
  padding: theme.spacing.xlarge,
}))

const InnerCardSC = styled(Card)(() => ({
  border: 'none',
  width: '100%',
  padding: 0,
}))

export function WorkbenchScheduleEmptyState() {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID]

  return (
    <OuterCardSC>
      <Body2BoldP>Schedules</Body2BoldP>
      <InnerCardSC>
        <EmptyState
          message="No schedules yet"
          description="Create a schedule for the workbench with prompt"
          css={{ margin: '0 auto', width: 500 }}
        >
          <Button
            secondary
            small
            onClick={() => {
              navigate(
                `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_TRIGGERS_REL_PATH}/${WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true`
              )
            }}
          >
            Create new schedule
          </Button>
        </EmptyState>
      </InnerCardSC>
    </OuterCardSC>
  )
}

export function WorkbenchWebhookEmptyState() {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID]

  return (
    <OuterCardSC>
      <Body2BoldP>Webhooks</Body2BoldP>
      <InnerCardSC>
        <EmptyState
          message="No webhooks yet"
          description="No webhook connected. Select an existing webhook or create a new one."
          css={{ margin: '0 auto', width: 500 }}
        >
          <Flex gap="small">
            <Button
              secondary
              small
              onClick={() => {}}
            >
              Create new webhook
            </Button>
            <Button
              small
              onClick={() => {
                navigate(
                  `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_TRIGGERS_REL_PATH}/${WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true`
                )
              }}
            >
              Select existing webhook
            </Button>
          </Flex>
        </EmptyState>
      </InnerCardSC>
    </OuterCardSC>
  )
}
