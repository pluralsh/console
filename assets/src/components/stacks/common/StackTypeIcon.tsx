import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import { IconFrame, type styledTheme } from '@pluralsh/design-system'
import { StackType } from 'generated/graphql'
import capitalize from 'lodash/capitalize'

export const StackTypeIcons = {
  [StackType.Terraform]: {
    dark: '/stacks/terraform.svg',
    light: '/stacks/terraform.svg',
  },
  [StackType.Ansible]: {
    dark: '/stacks/ansible.svg',
    light: '/stacks/ansible.svg',
  },
} as const satisfies Record<StackType, Record<typeof styledTheme.mode, string>>

export function getStackTypeIconUrl({
  type,
  mode,
}: {
  type: Nullable<StackType>
  mode: typeof styledTheme.mode
}) {
  return StackTypeIcons[type?.toUpperCase() ?? '']?.[mode]
}

export function useStackTypeIconUrl({ type }: { type: Nullable<StackType> }) {
  const theme = useTheme()

  return getStackTypeIconUrl({ type, mode: theme.mode })
}

export function StackTypeIcon({
  stackType,
  size = 16,
  ...props
}: {
  stackType: Nullable<StackType>
  size?: number
} & ComponentProps<'img'>) {
  const src = useStackTypeIconUrl({ type: stackType })

  return (
    <img
      alt={capitalize(stackType ?? '')}
      src={src}
      {...props}
      {...(size ? { height: size } : {})}
    />
  )
}

export function StackTypeIconFrame({
  stackType,
  ...props
}: {
  stackType: Nullable<StackType>
} & Omit<ComponentProps<typeof IconFrame>, 'icon'>) {
  return (
    <IconFrame
      textValue={capitalize(stackType ?? '')}
      tooltip={capitalize(stackType ?? '')}
      icon={<StackTypeIcon stackType={stackType} />}
      {...props}
    />
  )
}
