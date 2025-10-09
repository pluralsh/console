import { Button, Modal, ValidatedInput } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  ServiceAccountsDocument,
  useCreateServiceAccountMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { appendConnection, updateCache } from 'utils/graphql'

import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { SERVICE_ACCOUNTS_QUERY_PAGE_SIZE } from './ServiceAccountsList'

export default function ServiceAccountCreate({ q }: { q: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        floating
        onClick={() => setIsOpen(true)}
      >
        Create service account
      </Button>
      <ModalMountTransition open={isOpen}>
        <ServiceAccountCreateModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          q={q}
        />
      </ModalMountTransition>
    </>
  )
}

function ServiceAccountCreateModal({
  open,
  onClose,
  q,
}: {
  open: boolean
  onClose: () => void
  q: string
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [mutation, { loading, error }] = useCreateServiceAccountMutation({
    variables: { attributes: { name, email } },
    onCompleted: () => onClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: ServiceAccountsDocument,
        variables: { q, first: SERVICE_ACCOUNTS_QUERY_PAGE_SIZE },
        update: (prev) =>
          appendConnection(prev, data?.createServiceAccount, 'serviceAccounts'),
      }),
  })

  return (
    <Modal
      header="Create service account"
      open={open}
      onClose={() => onClose()}
      asForm
      onSubmit={(e) => {
        e.preventDefault()
        mutation()
      }}
      actions={
        <>
          <Button
            type="button"
            secondary
            onClick={() => onClose()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isEmpty(name)}
            onClick={() => mutation()}
            loading={loading}
            marginLeft="medium"
          >
            Create
          </Button>
        </>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        {error && (
          <GqlError
            header="Something went wrong"
            error={error}
          />
        )}
        <ValidatedInput
          value={name}
          onChange={({ target: { value } }) => setName(value)}
          label="Name"
        />
        <ValidatedInput
          label="Email"
          value={email}
          onChange={({ target: { value } }) => setEmail(value)}
        />
      </div>
    </Modal>
  )
}
