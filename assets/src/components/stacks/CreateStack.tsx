import { Button, Tooltip } from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { ReactNode } from 'react'

export default function CreateStack({
  buttonContent = 'Create stack',
  buttonProps,
}: {
  buttonProps?: ButtonProps
  buttonContent?: string | ReactNode
}) {
  return (
    <Tooltip label="Create stack">
      <Button {...buttonProps}>{buttonContent}</Button>
    </Tooltip>
  )
}
