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

import { SERVICE_ACCOUNTS_QUERY_PAGE_SIZE } from './ServiceAccountsList'

export default function ServiceAccountCreate({ q }: { q: string }) {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [mutation, { loading, error }] = useCreateServiceAccountMutation({
    variables: { attributes: { name, email } },
    onCompleted: () => setIsOpen(false),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: ServiceAccountsDocument,
        variables: { q, first: SERVICE_ACCOUNTS_QUERY_PAGE_SIZE },
        update: (prev) =>
          appendConnection(prev, data?.createServiceAccount, 'serviceAccounts'),
      }),
  })

  return (
    <>
      <Button
        floating
        onClick={() => setIsOpen(true)}
      >
        Create service account
      </Button>
      <Modal
        header="Create service account"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        actions={
          <>
            <Button
              secondary
              onClick={() => setIsOpen(false)}
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
    </>
  )
}
