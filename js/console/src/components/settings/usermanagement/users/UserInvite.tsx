import {
  Button,
  Codeline,
  MailIcon,
  Modal,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'

import { apiHost } from 'utils/hostname'

import { GqlError } from '../../../utils/Alert'

import { useCreateInviteMutation } from '../../../../generated/graphql.ts'

export const inviteLink = (invite) =>
  `https://${apiHost()}/invite/${invite.secureId}`

export default function UserInvite() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [invite, setInvite] = useState<any>(null)
  const [mutation, { loading, error, reset }] = useCreateInviteMutation({
    variables: { attributes: { email } },
    onCompleted: (data) => setInvite(data?.createInvite),
  })
  const resetAndClose = useCallback(() => {
    setEmail('')
    setInvite(null)
    setOpen(false)
    reset()
  }, [reset])

  return (
    <>
      <div>
        <Button
          secondary
          onClick={() => setOpen(true)}
        >
          Invite user
        </Button>
      </div>
      <Modal
        header="Invite users"
        open={open}
        onClose={() => resetAndClose()}
        actions={
          invite ? (
            <Button onClick={() => resetAndClose()}>Done</Button>
          ) : (
            <>
              <Button
                secondary
                onClick={() => resetAndClose()}
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation()}
                loading={loading}
                disabled={email.length === 0}
                marginLeft="medium"
              >
                Invite
              </Button>
            </>
          )
        }
      >
        <ValidatedInput
          disabled={!!invite}
          value={email}
          startIcon={<MailIcon />}
          onChange={({ target: { value } }) => setEmail(value)}
          label="Email address"
        />
        {error && (
          <GqlError
            error={error}
            header="Failed to invite user"
          />
        )}
        {invite?.secureId && (
          <Codeline marginTop="small">{inviteLink(invite)}</Codeline>
        )}
        {invite && !invite.secureId && (
          <span>An email was sent to {email} to accept the invite</span>
        )}
      </Modal>
    </>
  )
}
