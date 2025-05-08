import { Button } from '@pluralsh/design-system'

export function OidcCreateProviderForm({ onClose }: { onClose: () => void }) {
  return (
    <div>
      create provider <Button onClick={onClose}>close</Button>
    </div>
  )
}
