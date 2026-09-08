import { FormField, Input } from '@pluralsh/design-system'

import { CloudProviderSettingsAttributes } from '../../../generated/graphql'

import { ProviderCloud } from '../clusters/create/types'

import { InputRevealer } from './InputRevealer'
import GcpCredentials from './GcpCredentials'

export const SUPPORTED_CLOUDS = [
  ProviderCloud.AWS,
  ProviderCloud.Azure,
  ProviderCloud.GCP,
] as const satisfies readonly ProviderCloud[]

export function AwsSettings({
  settings,
  updateSettings,
}: {
  settings: CloudProviderSettingsAttributes['aws']
  updateSettings: (
    update: NonNullable<Partial<CloudProviderSettingsAttributes['aws']>>
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
    </>
  )
}

export function GcpSettings({
  settings,
  updateSettings,
}: {
  settings: CloudProviderSettingsAttributes['gcp']
  updateSettings: (
    update: NonNullable<Partial<CloudProviderSettingsAttributes['gcp']>>
  ) => void
}) {
  return (
    <GcpCredentials
      creds={settings?.applicationCredentials}
      setCreds={(creds) => {
        updateSettings({ applicationCredentials: creds })
      }}
    />
  )
}

export function AzureSettings({
  settings,
  updateSettings,
}: {
  settings: CloudProviderSettingsAttributes['azure']
  updateSettings: (
    update: NonNullable<Partial<CloudProviderSettingsAttributes['azure']>>
  ) => void
}) {
  return (
    <>
      <FormField label="Client ID">
        <InputRevealer
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
        <InputRevealer
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
    </>
  )
}
