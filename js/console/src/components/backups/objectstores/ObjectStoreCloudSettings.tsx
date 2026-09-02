import { FormField, Input } from '@pluralsh/design-system'

import { ObjectStoreAttributes } from '../../../generated/graphql'
import { InputRevealer } from '../../cd/providers/InputRevealer'
import GcpCredentials from '../../cd/providers/GcpCredentials'

export function S3Settings({
  settings,
  updateSettings,
}: {
  settings: ObjectStoreAttributes['s3']
  updateSettings: (
    update: NonNullable<Partial<ObjectStoreAttributes['s3']>>
  ) => void
}) {
  return (
    <>
      <FormField label="Access key ID">
        <InputRevealer
          value={settings?.accessKeyId}
          onChange={(e) => {
            updateSettings({ accessKeyId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Secret access key">
        <Input
          multiline
          minRows={3}
          maxRows={6}
          value={settings?.secretAccessKey}
          onChange={(e) => {
            updateSettings({ secretAccessKey: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Region">
        <Input
          type="text"
          value={settings?.region}
          onChange={(e) => {
            updateSettings({ region: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Endpoint">
        <Input
          type="text"
          value={settings?.endpoint}
          onChange={(e) => {
            updateSettings({ endpoint: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Bucket">
        <Input
          type="text"
          value={settings?.bucket}
          onChange={(e) => {
            updateSettings({ bucket: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function AzureSettings({
  settings,
  updateSettings,
}: {
  settings: ObjectStoreAttributes['azure']
  updateSettings: (
    update: NonNullable<Partial<ObjectStoreAttributes['azure']>>
  ) => void
}) {
  return (
    <>
      <FormField label="Client ID">
        <Input
          type="text"
          value={settings?.clientId}
          onChange={(e) => {
            updateSettings({ clientId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Client secret">
        <InputRevealer
          value={settings?.clientSecret}
          onChange={(e) => {
            updateSettings({ clientSecret: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Tenant ID">
        <Input
          type="text"
          value={settings?.tenantId}
          onChange={(e) => {
            updateSettings({ tenantId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Subscription ID">
        <Input
          type="text"
          value={settings?.subscriptionId}
          onChange={(e) => {
            updateSettings({ subscriptionId: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Resource group">
        <Input
          type="text"
          value={settings?.resourceGroup}
          onChange={(e) => {
            updateSettings({ resourceGroup: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Storage account">
        <Input
          type="text"
          value={settings?.storageAccount}
          onChange={(e) => {
            updateSettings({ storageAccount: e.currentTarget.value })
          }}
        />
      </FormField>
      <FormField label="Container">
        <Input
          type="text"
          value={settings?.container}
          onChange={(e) => {
            updateSettings({ container: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}

export function GcsSettings({
  settings,
  updateSettings,
}: {
  settings: ObjectStoreAttributes['gcs']
  updateSettings: (
    update: NonNullable<Partial<ObjectStoreAttributes['gcs']>>
  ) => void
}) {
  return (
    <>
      <GcpCredentials
        creds={settings?.applicationCredentials}
        setCreds={(creds) => {
          updateSettings({ applicationCredentials: creds })
        }}
      />
      <FormField label="Bucket">
        <Input
          type="text"
          value={settings?.bucket}
          onChange={(e) => {
            updateSettings({ bucket: e.currentTarget.value })
          }}
        />
      </FormField>
    </>
  )
}
