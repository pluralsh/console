import {
  CheckOutlineIcon,
  Chip,
  ErrorIcon,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { AlertState } from 'generated/graphql'
import { ComponentProps } from 'react'

export const alertStateLabel = (state: AlertState) =>
  state === AlertState.Firing ? 'Firing' : 'Resolved'

export function AlertStateChip({
  state,
  ...props
}: {
  state: AlertState
} & Omit<ComponentProps<typeof Chip>, 'children' | 'severity' | 'inactive'>) {
  const firing = state === AlertState.Firing
  return (
    <Chip
      css={{ width: 'max-content' }}
      size="small"
      severity={firing ? 'danger' : 'neutral'}
      inactive={!firing}
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {firing && <ErrorIcon size={12} />}
        {alertStateLabel(state)}
      </Flex>
    </Chip>
  )
}

export function AlertStateIcon({ state }: { state: AlertState }) {
  const firing = state === AlertState.Firing
  const label = alertStateLabel(state)

  return (
    <IconFrame
      type="tertiary"
      size="small"
      textValue={label}
      tooltip={label}
      icon={
        firing ? (
          <ErrorIcon color="icon-danger" />
        ) : (
          <CheckOutlineIcon color="icon-light" />
        )
      }
    />
  )
}
