import {
  Chip,
  FailedFilledIcon,
  SpinnerAlt,
  StatusIpIcon,
  StatusOkIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { WorkbenchJobActivityStatus } from 'generated/graphql'
import { ComponentProps, ReactElement } from 'react'

const chipCss = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .children': { whiteSpace: 'nowrap' },
} as const satisfies ComponentProps<typeof Chip>['css']

type StatusChipConfig = {
  label: string
  icon?: ReactElement
  iconColor?: ComponentProps<typeof Chip>['iconColor']
}

const STATUS_CHIPS: Partial<
  Record<WorkbenchJobActivityStatus, StatusChipConfig>
> = {
  [WorkbenchJobActivityStatus.NeedsApproval]: {
    label: 'Pending approval',
    icon: <WarningIcon />,
    iconColor: 'icon-warning',
  },
  [WorkbenchJobActivityStatus.Pending]: {
    label: 'Pending',
    icon: <StatusIpIcon />,
    iconColor: 'icon-light',
  },
  [WorkbenchJobActivityStatus.Running]: {
    label: 'Running',
    icon: <SpinnerAlt />,
  },
  [WorkbenchJobActivityStatus.Failed]: {
    label: 'Failed',
    icon: <FailedFilledIcon />,
    iconColor: 'icon-danger',
  },
  [WorkbenchJobActivityStatus.Successful]: {
    label: 'Succeeded',
    icon: <StatusOkIcon />,
    iconColor: 'icon-success',
  },
  [WorkbenchJobActivityStatus.Cancelled]: { label: 'Denied' },
  [WorkbenchJobActivityStatus.Rejected]: { label: 'Denied' },
}

export function WorkbenchJobActionStatusChip({
  status,
}: {
  status: Nullable<WorkbenchJobActivityStatus>
}) {
  if (!status) return null
  const chip = STATUS_CHIPS[status]
  if (!chip) return null

  return (
    <Chip
      fillLevel={2}
      icon={chip.icon}
      iconColor={chip.iconColor}
      css={chipCss}
    >
      {chip.label}
    </Chip>
  )
}
