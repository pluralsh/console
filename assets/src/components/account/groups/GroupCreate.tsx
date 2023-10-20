import { useCallback, useContext, useState } from 'react'
import { Button, Modal, ValidatedInput } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { GroupsDocument, useCreateGroupMutation } from 'generated/graphql'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'

import { useTheme } from 'styled-components'

import { appendConnection, updateCache } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'

export default function GroupCreate({ q }: { q: string }) {
  const theme = useTheme()
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [blockModalVisible, setBlockModalVisible] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const resetAndClose = useCallback(() => {
    setName('')
    setDescription('')
    setCreateModalVisible(false)
  }, [])

  const [mutation, { loading, error }] = useCreateGroupMutation({
    variables: { attributes: { name, description } },
    onCompleted: () => resetAndClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: GroupsDocument,
        variables: { q },
        update: (prev) => appendConnection(prev, data?.createGroup, 'groups'),
      }),
  })

  return (
    <>
      <Button
        secondary
        onClick={() =>
          isAvailable ? setCreateModalVisible(true) : setBlockModalVisible(true)
        }
      >
        Create group
      </Button>

      {/* Modals */}
      <Modal
        header="Create group"
        open={createModalVisible}
        onClose={() => resetAndClose()}
        actions={
          <>
            <Button
              secondary
              onClick={() => resetAndClose()}
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
            label="Description"
            value={description}
            onChange={({ target: { value } }) => setDescription(value)}
          />
        </div>
      </Modal>
      <BillingFeatureBlockModal
        open={blockModalVisible}
        message="Upgrade to Plural Professional to create a group."
        onClose={() => setBlockModalVisible(false)}
      />
    </>
  )
}
