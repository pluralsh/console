import {
  Button,
  ButtonProps,
  IconFrame,
  MagicWandIcon,
} from '@pluralsh/design-system'

function AISuggestFixButton({
  iconOnly,
  ...props
}: ButtonProps & { iconOnly?: boolean }) {
  return iconOnly ? (
    <IconFrame
      clickable
      tooltip
      textValue="Suggest a fix"
      icon={<MagicWandIcon />}
      {...props}
      type="secondary"
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
