import { Divider, Flex } from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext } from './Workbench'

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
      <StackedText
        first="Workbench jobs"
        firstPartialType="body2Bold"
        firstColor="text"
        second="Current and previous jobs"
        secondPartialType="body2"
        secondColor="text-light"
      />
      <WorkbenchJobsTable workbenchId={workbenchId} />
    </Flex>
  )
}
