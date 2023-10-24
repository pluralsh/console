import { FormField } from '@pluralsh/design-system'
import { Provider } from 'generated/graphql-plural'

import { InputRevealer } from './InputRevealer'
import { CloudProviderSettingsAttributes } from './CreateProvider'
import GcpCredentials from './GcpCredentials'

export const PROVIDER_KEYS = [
  'aws',
  'gcp',
  // 'azure',
] as const satisfies readonly Lowercase<Provider>[]

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
        <InputRevealer
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

// export function AzureSettings({
//   ...props
// }: {
//   settings: CloudProviderSettingsAttributes['azure']
//   updateSettings: (
//     update: NonNullable<Partial<CloudProviderSettingsAttributes['azure']>>
//   ) => void
// }) {
//   return (
//     <FormField label="Placeholder setting">
//       <InputRevealer />
//     </FormField>
//   )
// }
