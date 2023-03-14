import { useCallback, useContext, useState } from 'react'
import { Box } from 'grommet'
import { Button, Modal, ValidatedInput } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { GroupsDocument, useCreateGroupMutation } from 'generated/graphql'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { appendConnection, updateCache } from '../../../utils/graphql'
import { GqlError } from '../../utils/Alert'

export default function GroupCreate({ q }: {q: string}) {
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement || isPaidPlan
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const resetAndClose = useCallback(() => {
    setName('')
    setDescription('')
    setOpen(false)
  }, [])

  const [mutation, { loading, error }] = useCreateGroupMutation({
    variables: { attributes: { name, description } },
    onCompleted: () => resetAndClose(),
    update: (cache, { data }) => updateCache(cache, {
      query: GroupsDocument,
      variables: { q },
      update: prev => appendConnection(prev, data?.createGroup, 'groups'),
    }),
  })

  return (
    <>
      <Button
        disabled={!isAvailable}
        secondary
        onClick={() => setOpen(true)}
      >
        Create group
      </Button>
      <Modal
        header="Create group"
        open={open}
        onClose={() => resetAndClose()}
        actions={(
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
        )}
      >
        <Box
          width="50vw"
          gap="small"
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
        </Box>
      </Modal>
    </>
  )
}
