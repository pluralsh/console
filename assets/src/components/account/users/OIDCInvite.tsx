import { useQuery } from '@apollo/client'
import {
  Button,
  LoadingSpinner,
  Modal,
  PersonIcon,
} from '@pluralsh/design-system'
import { PluralApi } from 'components/PluralApi'
import { UserManagementCard } from 'components/apps/app/oidc/UserManagement'
import { INSTALLATION } from 'components/apps/app/oidc/queries'
import { GqlError } from 'components/utils/Alert'
import { useState } from 'react'

function OIDCInner() {
  const { data, error } = useQuery(INSTALLATION, {
    variables: { name: 'console' },
    fetchPolicy: 'cache-and-network',
  })

  if (error)
    return (
      <GqlError
        header="Could not find console OIDC provider"
        error={error}
      />
    )

  if (!data?.installation) return <LoadingSpinner />

  const { installation } = data

  return (
    <UserManagementCard
      id={installation.id}
      provider={installation.oidcProvider}
      header="Console OpenID User Management"
      description="Modify this console installation's OpenID provider to add or remove users"
    />
  )
}

export function OIDCInvite() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div>
        <Button
          startIcon={<PersonIcon />}
          secondary
          onClick={() => setOpen(true)}
        >
          Manage users
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="large"
      >
        <PluralApi>
          <OIDCInner />
        </PluralApi>
      </Modal>
    </>
  )
}
