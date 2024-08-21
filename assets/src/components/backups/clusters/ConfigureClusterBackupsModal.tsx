import { FormEvent, useCallback, useState } from 'react'
import { Button, FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import ModalAlt from '../../cd/ModalAlt'
import {
  ClustersObjectStoresFragment,
  useConfigureBackupsMutation,
  useObjectStoresQuery,
} from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'
import { ClusterSelect } from '../../cd/utils/ClusterSelect'
import LoadingIndicator from '../../utils/LoadingIndicator'

const QUERY_PAGE_SIZE = 100

export default function ConfigureClusterBackupsModal({
  open,
  onClose,
  refetch,
  clusters,
}: {
  open: boolean
  onClose: () => void
  refetch: Nullable<() => void>
  clusters: ClustersObjectStoresFragment[]
}) {
  const theme = useTheme()
  const [clusterId, setClusterId] = useState<string>('')
  const [storeId, setStoreId] = useState<string>('')

  const closeModal = useCallback(() => onClose(), [onClose])
  const onCompleted = useCallback(() => {
    refetch?.()
    closeModal()
  }, [refetch, closeModal])

  const {
    data,
    error: loadError,
    loading: loadingData,
  } = useObjectStoresQuery({
    variables: { first: QUERY_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  })

  const [mutation, { loading, error }] = useConfigureBackupsMutation({
    variables: { clusterId, storeId },
    onCompleted,
  })

  const disabled = !clusterId || !storeId

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )

  if (loadError) {
    return (
      <GqlError
        header="Something went wrong"
        error={error}
      />
    )
  }

  if (loadingData) {
    return <LoadingIndicator />
  }

  return (
    <ModalAlt
      header="Configure cluster backup"
      size="large"
      open={open}
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={disabled}
            loading={loading}
            primary
          >
            Save
          </Button>
          <Button
            type="button"
            secondary
            onClick={closeModal}
          >
            Cancel
          </Button>
        </>
      }
    >
      <p
        css={{
          ...theme.partials.text.overline,
          color: theme.colors['text-xlight'],
        }}
      >
        Configure backup
      </p>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          marginBottom: error ? theme.spacing.large : 0,
        }}
      >
        <FormField label="Cluster">
          <ClusterSelect
            clusters={clusters}
            selectedKey={clusterId}
            onSelectionChange={(key) => setClusterId(key as string)}
            label="Select cluster"
            withoutTitleContent
            withoutLeftContent={!clusterId}
          />
        </FormField>
        <FormField label="Object store">
          <Select
            selectedKey={storeId}
            onSelectionChange={(key) => setStoreId(key as string)}
            label="Select object store"
          >
            {(data?.objectStores?.edges || [])?.map((edge) => (
              <ListBoxItem
                key={edge?.node?.id}
                label={edge?.node?.name}
                textValue={edge?.node?.name}
              />
            ))}
          </Select>
        </FormField>
      </div>
      {error && (
        <div css={{ marginTop: theme.spacing.large }}>
          <GqlError
            header="Problem saving object store credentials"
            error={error}
          />
        </div>
      )}
    </ModalAlt>
  )
}
