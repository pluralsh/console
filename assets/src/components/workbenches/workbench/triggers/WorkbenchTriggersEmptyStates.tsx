import { Button, Card, EmptyState, Flex } from '@pluralsh/design-system'
import { Body2BoldP } from 'components/utils/typography/Text'
import styled from 'styled-components'

const OuterCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
}))

const InnerCardSC = styled(Card)(() => ({
  border: 'none',
  padding: 0,
}))

export function WorkbenchScheduleEmptyState() {
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
            onClick={() => {}}
          >
            Create new schedule
          </Button>
        </EmptyState>
      </InnerCardSC>
    </OuterCardSC>
  )
}

export function WorkbenchWebhookEmptyState() {
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
              onClick={() => {}}
            >
              Select existing webhook
            </Button>
          </Flex>
        </EmptyState>
      </InnerCardSC>
    </OuterCardSC>
  )
}
