import { Tooltip } from '@pluralsh/design-system'
import { Div, Flex, Span } from 'honorable'
import styled from 'styled-components'
import { Readiness, ReadinessT } from 'utils/status'

import { ContainerStatus } from './pods/PodsList'

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
  [Readiness.InProgress]: <PendingIcon />,
  [Readiness.Failed]: <FailedIcon />,
  [Readiness.Complete]: <CompleteIcon />,
} as const satisfies Record<ReadinessT, JSX.Element>

export const readinessToLabel = {
  [Readiness.Ready]: 'Running',
  [Readiness.InProgress]: 'Pending',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
} as const satisfies Record<ReadinessT, string>

export const readinessToTooltipColor = {
  [Readiness.Ready]: 'text-success-light',
  [Readiness.InProgress]: 'text-warning-light',
  [Readiness.Failed]: 'text-danger-light',
  [Readiness.Complete]: 'text-xlight',
} as const satisfies Record<ReadinessT, string>

export function ContainerStatuses({ statuses = [] }: {statuses: ContainerStatus[]}) {
  return (
    <Flex gap="xxxsmall">
      {statuses.map(({ name, readiness }) => (
        <Tooltip label={(
          <>
            <Span>{name}:&nbsp;</Span>
            <Span
              color={readinessToTooltipColor[readiness]}
              fontWeight={600}
            >
              {readinessToLabel[readiness]}
            </Span>
          </>
        )}
        >
          <Div
            borderRadius={3}
            padding={4}
            _hover={{ backgroundColor: 'fill-two-hover' }}
          >
            {readinessToIcon[readiness]}
          </Div>
        </Tooltip>
      ))}
    </Flex>
  )
}
