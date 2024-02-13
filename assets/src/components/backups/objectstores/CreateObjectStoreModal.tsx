import { FormEvent, ReactNode, useCallback, useReducer, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { produce } from 'immer'
import { PartialDeep } from 'type-fest'
import merge from 'lodash/merge'
import { useTheme } from 'styled-components'

import ModalAlt from '../../cd/ModalAlt'
import {
  ObjectStoreAttributes,
  useCreateObjectStoreMutation,
} from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'

import {
  AzureSettings,
  GcsSettings,
  S3Settings,
} from './ObjectStoreCloudSettings'
import {
  ObjectStoreCloud,
  ObjectStoreCloudIcon,
  SUPPORTED_CLOUDS,
  objectStoreCloudToDisplayName,
} from './utils'

const updateSettings = produce(
  (
    original: Omit<ObjectStoreAttributes, 'name'>,
    update: PartialDeep<Omit<ObjectStoreAttributes, 'name'>>
  ) => {
    merge(original, update)

    return original
  }
)

export default function CreateObjectStoreModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const [name, setName] = useState('')
  const [cloud, setCloud] = useState<ObjectStoreCloud>(ObjectStoreCloud.S3)
  const [cloudSettings, updateCloudSettings] = useReducer(updateSettings, {})
  const closeModal = useCallback(() => onClose(), [onClose])
  const [mutation, { loading, error }] = useCreateObjectStoreMutation({
    variables: { attributes: { name, [cloud]: cloudSettings[cloud] } },
    onCompleted: () => {
      refetch?.()
      closeModal()
    },
  })

  let settings: ReactNode

  switch (cloud) {
    case 's3':
      settings = (
        <S3Settings
          settings={cloudSettings.s3}
          updateSettings={(settings) => updateCloudSettings({ s3: settings })}
        />
      )
      break
    case 'azure':
      settings = (
        <AzureSettings
          settings={cloudSettings.azure}
          updateSettings={(settings) =>
            updateCloudSettings({ azure: settings })
          }
        />
      )
      break
    case 'gcs':
      settings = (
        <GcsSettings
          settings={cloudSettings.gcs}
          updateSettings={(settings) => updateCloudSettings({ gcs: settings })}
        />
      )
      break
  }

  let disabled = !name || !cloud

  switch (cloud) {
    case ObjectStoreCloud.S3:
      disabled =
        disabled ||
        !(
          cloudSettings.s3?.accessKeyId &&
          cloudSettings.s3?.secretAccessKey &&
          cloudSettings.s3?.region &&
          cloudSettings.s3?.endpoint &&
          cloudSettings.s3?.bucket
        )
      break
    case ObjectStoreCloud.GCS:
      disabled =
        disabled ||
        !(
          cloudSettings.gcs?.applicationCredentials &&
          cloudSettings.gcs?.region &&
          cloudSettings.gcs?.bucket
        )
      break
    case ObjectStoreCloud.Azure:
      disabled =
        disabled ||
        !(
          cloudSettings.azure?.clientId &&
          cloudSettings.azure?.clientSecret &&
          cloudSettings.azure?.tenantId &&
          cloudSettings.azure?.subscriptionId &&
          cloudSettings.azure?.storageAccount &&
          cloudSettings.azure?.container
        )
      break
  }

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )

  return (
    <ModalAlt
      header="Add object store"
      size="large"
      style={{ padding: 0, position: 'absolute' }}
      open={open}
      portal
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
            Create
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
        Configure object store
      </p>
      <FormField label="Cloud provider">
        <Select
          selectedKey={cloud}
          leftContent={<ObjectStoreCloudIcon cloud={cloud} />}
          onSelectionChange={(key) => {
            setCloud(key as ObjectStoreCloud)
          }}
        >
          {SUPPORTED_CLOUDS.map((t) => (
            <ListBoxItem
              key={t}
              label={objectStoreCloudToDisplayName[t]}
              textValue={t}
            />
          ))}
        </Select>
      </FormField>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          marginBottom: error ? theme.spacing.large : 0,
        }}
      >
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </FormField>
        {settings}
      </div>
      {error && (
        <div css={{ marginTop: theme.spacing.large }}>
          <GqlError
            header="Problem creating provider"
            error={error}
          />
        </div>
      )}
    </ModalAlt>
  )
}
