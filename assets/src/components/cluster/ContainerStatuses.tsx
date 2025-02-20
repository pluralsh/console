import { Flex, Tooltip } from '@pluralsh/design-system'
import { Div, Span } from 'honorable'
import styled from 'styled-components'
import { Readiness, ReadinessT, readinessToContainerLabel } from 'utils/status'

import { type JSX, ReactElement } from 'react'
import { ContainerStatusT } from '../cd/cluster/pod/PodsList.tsx'

const iconBaseProps = {
  borderRadius: 3,
  height: 14,
  width: 14,
}

const ReadyIcon = styled.div(({ theme }) => ({
  ...iconBaseProps,
  backgroundColor: theme.colors['icon-success'],
}))

const PendingIcon = styled.div(({ theme }) => ({
  ...iconBaseProps,
  border: '1px dashed',
  borderColor: theme.colors['border-warning'],
}))

const FailedIcon = styled.div(({ theme }) => ({
  ...iconBaseProps,
  border: '1px solid',
  borderColor: theme.colors['border-danger'],
}))

const CompleteIcon = styled.div(({ theme }) => ({
  ...iconBaseProps,
  backgroundColor: theme.colors['icon-disabled'],
}))

export const readinessToIcon = {
  [Readiness.Ready]: <ReadyIcon />,
  [Readiness.Running]: <ReadyIcon />,
  [Readiness.InProgress]: <PendingIcon />,
  [Readiness.Failed]: <FailedIcon />,
  [Readiness.Complete]: <CompleteIcon />,
  [Readiness.Completed]: <CompleteIcon />,
} as const satisfies Record<ReadinessT, JSX.Element>

export const readinessToTooltipColor = {
  [Readiness.Ready]: 'text-success-light',
  [Readiness.Running]: 'text-success-light',
  [Readiness.InProgress]: 'text-warning-light',
  [Readiness.Failed]: 'text-danger-light',
  [Readiness.Complete]: 'text-xlight',
  [Readiness.Completed]: 'text-xlight',
} as const satisfies Record<ReadinessT, string>

export function ContainerStatuses({
  statuses = [],
}: {
  statuses: ContainerStatusT[]
}) {
  return (
    <Flex gap="xxxsmall">
      {statuses.map(({ name, readiness }) => (
        <ContainerStatus
          key={name}
          status={{ name, readiness }}
        />
      ))}
    </Flex>
  )
}

export function ContainerStatus({
  status,
}: {
  status: ContainerStatusT
}): ReactElement<any> {
  const { name, readiness } = status

  return (
    <Tooltip
      label={
        <>
          {name && <span>{name}:&nbsp;</span>}
          <Span
            color={readinessToTooltipColor[readiness]}
            fontWeight={600}
          >
            {readinessToContainerLabel[readiness]}
          </Span>
        </>
      }
    >
      <Div
        borderRadius={3}
        padding={2}
        _hover={{ backgroundColor: 'fill-two-hover' }}
      >
        {readinessToIcon[readiness]}
      </Div>
    </Tooltip>
  )
}
