import { Button, ErrorIcon } from '@pluralsh/design-system'
import { useState } from 'react'

import { ApiDeprecation } from '../../../generated/graphql'

export default function Deprecations({
  deprecations,
}: {
  deprecations?: (ApiDeprecation | null)[] | null
}) {
  // const theme = useTheme()
  const [_, setIsOpen] = useState(false)
  // const closeModal = useCallback(() => setIsOpen(false), [])
  // const onClose = useCallback(() => setIsOpen(false), [])

  return (
    <Button
      small
      floating
      width="fit-content"
      startIcon={
        <ErrorIcon
          color="icon-danger"
          width={16}
        />
      }
      onClick={() => setIsOpen(true)}
    >
      Deprecations
    </Button>
  )
}
