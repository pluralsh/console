import { Divider, Flex } from '@pluralsh/design-system'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext } from './Workbench'
import { Body2BoldP } from 'components/utils/typography/Text'

export function WorkbenchJobs() {
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()

  return (
    <Flex
      direction="column"
      gap="large"
      minHeight={700}
      paddingBottom={32}
    >
      <WorkbenchJobCreateInput
        workbenchId={workbenchId}
        workbenchLoading={isLoading}
      />
      <Divider backgroundColor="border" />
      <Body2BoldP>Workbench job history</Body2BoldP>
      <WorkbenchJobsTable workbenchId={workbenchId} />
    </Flex>
  )
}
