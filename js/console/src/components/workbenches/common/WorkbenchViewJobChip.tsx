import {
  CheckOutlineIcon,
  Chip,
  FailedFilledIcon,
  Flex,
  SpinnerAlt,
  UnknownIcon,
} from '@pluralsh/design-system'
import { WorkbenchJobStatus } from 'generated/graphql'
import { type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'

function jobStatusIcon(status?: Nullable<WorkbenchJobStatus>): ReactNode {
  switch (status) {
    case WorkbenchJobStatus.Pending:
    case WorkbenchJobStatus.Running:
      return <SpinnerAlt size={12} />
    case WorkbenchJobStatus.Successful:
      return (
        <CheckOutlineIcon
          size={12}
          color="icon-success"
        />
      )
    case WorkbenchJobStatus.Failed:
      return (
        <FailedFilledIcon
          size={12}
          color="icon-danger"
        />
      )
    default:
      return (
        <UnknownIcon
          size={12}
          color="icon-xlight"
        />
      )
  }
}

export function WorkbenchViewJobChip({
  workbenchId,
  jobId,
  status,
  onNavigate,
  stopPropagation = true,
  ...props
}: {
  workbenchId: string
  jobId: string
  status?: Nullable<WorkbenchJobStatus>
  onNavigate?: () => void
  stopPropagation?: boolean
} & Omit<ComponentProps<typeof Chip>, 'children' | 'onClick'>) {
  const navigate = useNavigate()

  const handleClick = (event: MouseEvent) => {
    if (stopPropagation) event.stopPropagation()
    navigate(getWorkbenchJobAbsPath({ workbenchId, jobId }))
    onNavigate?.()
  }

  return (
    <Chip
      clickable
      onClick={handleClick}
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {jobStatusIcon(status)}
        <span>View job</span>
      </Flex>
    </Chip>
  )
}
