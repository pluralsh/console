import { Flex } from '@pluralsh/design-system'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchLaunchRecentJobs } from './WorkbenchLaunchRecentJobs'
import { useOutletContext } from 'react-router-dom'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import styled from 'styled-components'

export function WorkbenchLaunch() {
  const { workbenchId, isLoading } = useOutletContext<WorkbenchOutletContext>()

  return (
    <WorkbenchPageLayout>
      <WrapperSC>
        <WorkbenchJobCreateInput
          workbenchId={workbenchId}
          workbenchLoading={isLoading}
          wrapperStyles={{ maxWidth: 'none' }}
        />
        <WorkbenchLaunchRecentJobs workbenchId={workbenchId} />
      </WrapperSC>
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  flex: 1,
  minHeight: 400,
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))
