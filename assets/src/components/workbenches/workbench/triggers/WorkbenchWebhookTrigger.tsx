import { Flex } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { useOutletContext } from 'react-router-dom'
import {
  WorkbenchScheduleEmptyState,
  WorkbenchWebhookEmptyState,
} from './WorkbenchTriggersEmptyStates'
import { WorkbenchTriggersOutletContext } from './WorkbenchTriggers'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'

export function WorkbenchWebhookTrigger() {
  const { hasSchedules, hasWebhooks } =
    useOutletContext<WorkbenchTriggersOutletContext>()

  if (!hasWebhooks)
    return (
      <Flex
        direction="column"
        gap="medium"
        flex={1}
      >
        <WorkbenchWebhookEmptyState />
        {!hasSchedules && <WorkbenchScheduleEmptyState />}
      </Flex>
    )

  return (
    <FormCardSC>
      <Body2P $color="text-light">...</Body2P>
    </FormCardSC>
  )
}
