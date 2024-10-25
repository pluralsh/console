import { Button, MagicWandIcon } from '@pluralsh/design-system'
import { ComponentProps, ReactNode } from 'react'

function AISuggestFixButton({
  ...props
}: Omit<ComponentProps<typeof Button>, 'startIcon'>): ReactNode {
  return (
    <Button
      startIcon={<MagicWandIcon />}
      {...props}
    >
      Suggest a fix
    </Button>
  )
}

export { AISuggestFixButton }
