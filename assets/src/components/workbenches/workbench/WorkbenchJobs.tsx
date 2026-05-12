import { Divider, Flex } from '@pluralsh/design-system'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext } from './Workbench'
import { Body2BoldP } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'

export function WorkbenchJobs() {
  const theme = useTheme()
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()

  return (
    <Flex
      direction="column"
      gap="large"
      minHeight={400}
      css={{
        padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
      }}
    >
      <WorkbenchJobCreateInput
        workbenchId={workbenchId}
        workbenchLoading={isLoading}
      />
      <Divider backgroundColor="border" />
      <Body2BoldP>Workbench Jobs</Body2BoldP>
      <WorkbenchJobsTable workbenchId={workbenchId} />
    </Flex>
  )
}
