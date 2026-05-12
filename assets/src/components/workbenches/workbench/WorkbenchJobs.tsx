import { Divider, Flex } from '@pluralsh/design-system'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import { Body2BoldP } from 'components/utils/typography/Text'
import styled from 'styled-components'

export function WorkbenchJobs() {
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()

  return (
    <WorkbenchPageLayout>
      <WrapperSC>
        <WorkbenchJobCreateInput
          workbenchId={workbenchId}
          workbenchLoading={isLoading}
        />
        <Divider backgroundColor="border" />
        <Body2BoldP>Workbench Jobs</Body2BoldP>
        <TableContainerSC>
          <WorkbenchJobsTable workbenchId={workbenchId} />
        </TableContainerSC>
      </WrapperSC>
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  flex: 1,
  minHeight: 400,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
