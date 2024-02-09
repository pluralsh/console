import { useState } from 'react'
import { ArchitectureIcon, IconFrame, Modal } from '@pluralsh/design-system'

import { isEmpty } from 'lodash'

import { AccessTokenFragment } from '../../generated/graphql'

export function AccessTokensScopes({ token }: { token: AccessTokenFragment }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        textValue="Scopes"
        tooltip
        clickable
        size="medium"
        icon={<ArchitectureIcon />}
        onClick={() => setOpen(true)}
      />
      <Modal
        header="Access token scopes"
        open={open}
        onClose={() => setOpen(false)}
      >
        {!isEmpty(token.scopes) ? <>...</> : <>This token has full access.</>}
      </Modal>
    </>
  )
}
