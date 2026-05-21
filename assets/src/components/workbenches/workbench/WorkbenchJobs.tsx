import { Flex } from '@pluralsh/design-system'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import styled from 'styled-components'

export function WorkbenchJobs() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()

  return (
    <WorkbenchPageLayout>
      <WrapperSC>
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
