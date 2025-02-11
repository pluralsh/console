import { Button, IconFrame, MagicWandIcon } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

function AISuggestFixButton({
  iconOnly,
  ...props
}: Omit<ComponentProps<typeof Button>, 'startIcon'> & { iconOnly?: boolean }) {
  return iconOnly ? (
    <IconFrame
      clickable
      tooltip
      textValue="Suggest a fix"
      icon={<MagicWandIcon />}
      type="secondary"
      {...props}
    />
  ) : (
    <Button
      startIcon={<MagicWandIcon />}
      {...props}
    >
      Suggest a fix
    </Button>
  )
}

export { AISuggestFixButton }
