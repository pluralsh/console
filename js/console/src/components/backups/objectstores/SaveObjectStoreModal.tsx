import {
  FormEvent,
  ReactNode,
  useCallback,
  useMemo,
  useReducer,
  useState,
} from 'react'
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
  ObjectStore,
  ObjectStoreAttributes,
  useCreateObjectStoreMutation,
  useUpdateObjectStoreMutation,
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
  getObjectStoreCloud,
  getObjectStoreCloudAttributes,
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

export default function SaveObjectStoreModal({
  open,
  onClose,
  refetch,
  objectStore, // Set to use edit mode.
}: {
  open: boolean
  onClose: () => void
  refetch: Nullable<() => void>
  objectStore?: ObjectStore
}) {
  const theme = useTheme()

  const { editMode, initialName, initialCloud, initialCloudSettings } = useMemo(
    () => ({
      editMode: !!objectStore,
      initialName: objectStore?.name ?? '',
      initialCloud: getObjectStoreCloud(objectStore) ?? ObjectStoreCloud.S3,
      initialCloudSettings: getObjectStoreCloudAttributes(objectStore),
    }),
    [objectStore]
  )

  const [name, setName] = useState<string>(initialName)
  const [cloud, setCloud] = useState<ObjectStoreCloud>(initialCloud)
  const [cloudSettings, updateCloudSettings] = useReducer(
    updateSettings,
    initialCloudSettings
  )

  const closeModal = useCallback(() => onClose(), [onClose])
  const onCompleted = useCallback(() => {
    refetch?.()
    closeModal()
  }, [refetch, closeModal])

  const [createMutation, { loading: creating, error: createError }] =
    useCreateObjectStoreMutation({
      variables: { attributes: { name, [cloud]: cloudSettings[cloud] } },
      onCompleted,
    })

  const [updateMutation, { loading: updating, error: updateError }] =
    useUpdateObjectStoreMutation({
      variables: {
        id: objectStore?.id ?? '',
        attributes: { name, [cloud]: cloudSettings[cloud] },
      },
      onCompleted,
    })

  const loading = creating || updating
  const error = createError ?? updateError

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
          cloudSettings.gcs?.applicationCredentials && cloudSettings.gcs?.bucket
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
        if (objectStore) updateMutation()
        else createMutation()
      }
    },
    [disabled, loading, objectStore, updateMutation, createMutation]
  )

  return (
    <ModalAlt
      header={editMode ? 'Update object store' : 'Add object store'}
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
            {editMode ? 'Update' : 'Create'}
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
            header="Problem saving object store credentials"
            error={error}
          />
        </div>
      )}
    </ModalAlt>
  )
}
