import { ReactNode, useReducer, useState } from 'react'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { produce } from 'immer'
import { PartialDeep } from 'type-fest'
import merge from 'lodash/merge'

import { useTheme } from 'styled-components'

import ModalAlt from '../../cd/ModalAlt'
import { ProviderCloud } from '../../cd/clusters/create/types'
import { ObjectStoreAttributes } from '../../../generated/graphql'

import { GqlError } from '../../utils/Alert'

import {
  AzureSettings,
  GcsSettings,
  S3Settings,
  SUPPORTED_CLOUDS,
} from './ObjectStoreCloudSettings'

const updateSettings = produce(
  (
    original: ObjectStoreAttributes,
    update: PartialDeep<ObjectStoreAttributes>
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
  onClose: Nullable<() => void>
  refetch: () => void
}) {
  const theme = useTheme()
  const error = null

  const [selectedCloud, setSelectedCloud] = useState<ProviderCloud>(
    ProviderCloud.AWS
  )
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    { name: '' }
  )

  let settings: ReactNode

  switch (selectedCloud) {
    case 'aws':
      settings = (
        <S3Settings
          settings={providerSettings.s3}
          updateSettings={(settings) =>
            updateProviderSettings({ s3: settings })
          }
        />
      )
      break
    case 'gcp':
      settings = (
        <GcsSettings
          settings={providerSettings.gcs}
          updateSettings={(settings) =>
            updateProviderSettings({ gcs: settings })
          }
        />
      )
      break
    case 'azure':
      settings = (
        <AzureSettings
          settings={providerSettings.azure}
          updateSettings={(settings) =>
            updateProviderSettings({ azure: settings })
          }
        />
      )
      break
  }

  return (
    <ModalAlt
      header="Add object store"
      size="large"
      style={{ padding: 0, position: 'absolute' }}
      open={open}
      portal
      onClose={() => {
        onClose?.()
      }}
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
          selectedKey={selectedCloud}
          // TODO
          // @ts-ignore
          onSelectionChange={setSelectedCloud}
        >
          {SUPPORTED_CLOUDS.map((t) => (
            <ListBoxItem
              key={t}
              label={t}
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
            value={providerSettings.name}
            onChange={(e) => {
              updateProviderSettings({ name: e.currentTarget.value })
            }}
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
