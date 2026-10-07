import { Button } from '@pluralsh/design-system'
import CommandPaletteShortcuts from 'components/commandpalette/CommandPaletteShortcuts'

export function ExitFullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      small
      floating
      onClick={onClick}
      endIcon={<CommandPaletteShortcuts shortcuts={['esc']} />}
    >
      Exit full screen
    </Button>
  )
}
