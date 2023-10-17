import {
  Button,
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { produce } from 'immer'
import { merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import {
  CloudProviderSettingsAttributes as SettingsTemp,
  useCreateClusterProviderMutation,
} from 'generated/graphql'
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { GqlError } from 'components/utils/Alert'

import ProviderIcon, { getProviderName } from 'components/utils/Provider'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt from '../ModalAlt'

import { AwsSettings, GcpSettings, PROVIDER_KEYS } from './ProviderSettings'

// TODO: Replace when api updated
export type CloudProviderSettingsAttributes = SettingsTemp & {
  azure?: Record<string, string> | null | undefined
}

const updateSettings = produce(
  (
    original: CloudProviderSettingsAttributes,
    update: PartialDeep<CloudProviderSettingsAttributes>
  ) => {
    merge(original, update)

    return original
  }
)

export function CreateProviderModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const closeModal = useCallback(() => onClose(), [onClose])

  const [name, setName] = useState('')

  const [selectedProvider, setSelectedProvider] = useState<
    (typeof PROVIDER_KEYS)[number] | ''
  >('')
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    {}
  )

  let disabled = !name || !selectedProvider

  switch (selectedProvider) {
    case 'aws':
      disabled =
        disabled ||
        !(
          providerSettings.aws?.accessKeyId &&
          providerSettings.aws?.secretAccessKey
        )
      break
    case 'gcp':
      disabled = disabled || !providerSettings.gcp?.applicationCredentials
      break
    // case 'azure':
    //   //  TODO: Add disabled conditions once azure support is added to api
    //   disabled = true
    //   break
  }

  const [mutation, { loading, error }] = useCreateClusterProviderMutation({
    variables: {
      attributes: {
        name,
        cloud: selectedProvider,
        cloudSettings: {
          [selectedProvider]: providerSettings[selectedProvider],
        },
      },
    },
    onCompleted: () => {
      refetch?.()
      closeModal()
    },
  })

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )
  let settings: ReactNode

  const inputRef = useRef<HTMLInputElement>()

  switch (selectedProvider) {
    case 'aws':
      settings = (
        <AwsSettings
          settings={providerSettings.aws}
          updateSettings={(settings) =>
            updateProviderSettings({ aws: settings })
          }
        />
      )
      break
    case 'gcp':
      settings = (
        <GcpSettings
          settings={providerSettings.gcp}
          updateSettings={(settings) =>
            updateProviderSettings({ gcp: settings })
          }
        />
      )
      break
    // case 'azure':
    //   settings = (
    //     <AzureSettings
    //       settings={providerSettings.azure}
    //       updateSettings={(settings) =>
    //         updateProviderSettings({ azure: settings })
    //       }
    //     />
    //   )
    //   break
  }

  useEffect(() => {
    if (open) {
      inputRef.current?.focus?.()
    }
  }, [open])

  return (
    <ModalAlt
      header="Create provider"
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
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
      >
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value)
            }}
          />
        </FormField>
        <FormField label="Cloud provider">
          <Select
            label="Select cloud provider"
            leftContent={
              selectedProvider && (
                <ProviderIcon
                  provider={selectedProvider}
                  width={16}
                />
              )
            }
            selectedKey={selectedProvider}
            onSelectionChange={(key) => setSelectedProvider(key as any)}
          >
            {PROVIDER_KEYS.map((provider) => (
              <ListBoxItem
                key={provider}
                label={getProviderName(provider)}
                leftContent={
                  <ProviderIcon
                    provider={provider}
                    width={16}
                  />
                }
              />
            ))}
          </Select>
        </FormField>
        {settings}
      </div>
      {error && (
        <GqlError
          header="Problem deploying service"
          error={error}
        />
      )}
    </ModalAlt>
  )
}

export function CreateProvider({ refetch }: { refetch: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Create provider
      </Button>
      <ModalMountTransition open={isOpen}>
        <CreateProviderModal
          refetch={refetch}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
