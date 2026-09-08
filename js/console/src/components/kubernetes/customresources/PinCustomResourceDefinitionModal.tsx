import { Dispatch, useState } from 'react'
import { Button, Modal, ValidatedInput } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { usePinCustomResourceMutation } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { useParams } from 'react-router-dom'

import { GqlError } from '../../utils/Alert'
import { useRefetch } from '../Cluster'

export default function PinCustomResourceDefinitionModal({
  name,
  group,
  version,
  kind,
  namespaced,
  onClose,
}: {
  name: string
  group: string
  version: string
  kind: string
  namespaced: boolean
  onClose?: Nullable<Dispatch<void>>
}) {
  const theme = useTheme()
  const { clusterId } = useParams()
  const refetch = useRefetch()
  const [displayName, setDisplayName] = useState(kind)

  const [mutation, { error, loading }] = usePinCustomResourceMutation({
    variables: {
      attributes: {
        name,
        group,
        version,
        kind,
        namespaced,
        clusterId,
        displayName,
      },
    },
    onCompleted: () => refetch?.(),
  })

  return (
    <Modal
      header="Pin Custom Resource Definition"
      open
      onClose={onClose ? () => onClose() : undefined}
      actions={
        <>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isEmpty(displayName)}
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
            header="Sorry, something went wrong"
            error={error}
          />
        )}
        <ValidatedInput
          value={displayName}
          onChange={({ target: { value } }) => setDisplayName(value)}
          label="Display name"
        />
      </div>
    </Modal>
  )
}
