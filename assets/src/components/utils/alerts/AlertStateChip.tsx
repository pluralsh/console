import { Chip, ErrorIcon, Flex } from '@pluralsh/design-system'
import { AlertState } from 'generated/graphql'
import { ComponentProps } from 'react'

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
        {firing ? 'Firing' : 'Non-firing'}
      </Flex>
    </Chip>
  )
}
