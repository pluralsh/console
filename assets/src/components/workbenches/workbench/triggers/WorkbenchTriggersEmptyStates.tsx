import { Button, Card, EmptyState, Flex } from '@pluralsh/design-system'
import { Body2BoldP } from 'components/utils/typography/Text'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
  WORKBENCHES_CRON_SCHEDULES_REL_PATH,
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

const InnerCardSC = styled(Card)(() => ({
  border: 'none',
  width: '100%',
  padding: 0,
}))

export function WorkbenchScheduleEmptyState() {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID]

  return (
    <InnerCardSC>
      <EmptyState
        message="No schedules yet"
        description="Create a schedule for the workbench with prompt"
        css={{ margin: '0 auto', width: 500 }}
      >
        <Button
          small
          onClick={() => {
            navigate(
              `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true`
            )
          }}
        >
          Create new schedule
        </Button>
      </EmptyState>
    </InnerCardSC>
  )
}

export function WorkbenchWebhookEmptyState() {
  const navigate = useNavigate()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID]

  return (
    <InnerCardSC>
      <EmptyState
        message="No webhooks yet"
        description="No webhook connected. Select an existing webhook or create a new one."
        css={{ margin: '0 auto', width: 500 }}
      >
        <Flex gap="small">
          <Button
            small
            onClick={() => {
              navigate(
                `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}?${WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM}=true`
              )
            }}
          >
            Create new webhook
          </Button>
        </Flex>
      </EmptyState>
    </InnerCardSC>
  )
}
