import { Button, FormField, Input, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { produce } from 'immer'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'
import { PartialDeep } from 'type-fest'

import {
  CloudProviderSettingsAttributes,
  ClusterProviderFragment,
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
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt from '../ModalAlt'
import { ProviderTabSelector } from '../clusters/create/ProviderTabSelector'

import {
  AwsSettings,
  AzureSettings,
  GcpSettings,
  SUPPORTED_CLOUDS,
} from './ProviderSettings'

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
  providers,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
  providers: Nullable<Nullable<ClusterProviderFragment>[]>
}) {
  const theme = useTheme()
  const closeModal = useCallback(() => onClose(), [onClose])

  const [name, setName] = useState('')

  const [selectedCloud, setSelectedCloud] = useState<
    (typeof SUPPORTED_CLOUDS)[number] | ''
  >(
    SUPPORTED_CLOUDS.find(
      (cloud) => !providers?.some((p) => p?.cloud === cloud)
    ) || ''
  )
  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    {}
  )

  let disabled = !name || !selectedCloud

  switch (selectedCloud) {
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
    case 'azure':
      disabled =
        disabled ||
        !(
          providerSettings.azure?.clientId &&
          providerSettings.azure?.clientSecret &&
          providerSettings.azure?.tenantId &&
          providerSettings.azure?.subscriptionId
        )
      break
  }

  const [mutation, { loading, error }] = useCreateClusterProviderMutation({
    variables: {
      attributes: {
        name,
        cloud: selectedCloud,
        cloudSettings: {
          [selectedCloud]: providerSettings[selectedCloud],
        },
      },
    },
    onCompleted: () => {
      refetch?.()
      closeModal()
    },
  })

  let settings: ReactNode

  const inputRef = useRef<HTMLInputElement>()

  const enabledProviders = SUPPORTED_CLOUDS.filter(
    (cloud) => !providers?.some((provider) => provider?.cloud === cloud)
  )
  const noMoreClouds = isEmpty(enabledProviders)

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (noMoreClouds) {
        onClose?.()
      } else if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation, noMoreClouds, onClose]
  )

  switch (selectedCloud) {
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

  useEffect(() => {
    if (open) {
      inputRef.current?.focus?.()
    }
  }, [open])

  if (noMoreClouds) {
    return (
      <Modal
        portal
        open={open}
        onClose={onClose}
      >
        You have already created providers for all available cloud services.
      </Modal>
    )
  }

  return (
    <ModalAlt
      header="Create provider"
      open={open}
      portal
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        noMoreClouds ? (
          <Button
            type="submit"
            primary
          >
            Close
          </Button>
        ) : (
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
        )
      }
    >
      <ProviderTabSelector
        enabledProviders={enabledProviders}
        selectedProvider={selectedCloud}
        onProviderChange={(key) => setSelectedCloud(key as any)}
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
          {settings}
        </div>
        {error && (
          <GqlError
            header="Problem creating provider"
            error={error}
          />
        )}
      </ProviderTabSelector>
    </ModalAlt>
  )
}

export function CreateProvider({
  refetch,
  providers,
}: {
  refetch: () => void
  providers: Nullable<Nullable<ClusterProviderFragment>[]>
}) {
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
          providers={providers}
        />
      </ModalMountTransition>
    </>
  )
}
