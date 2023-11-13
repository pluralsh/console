import { Button, GearTrainIcon, IconFrame } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { produce } from 'immer'
import { merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import {
  ClusterProviderFragment,
  CloudProviderSettingsAttributes as SettingsTemp,
  useUpdateClusterProviderMutation,
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

import { getProviderName } from 'components/utils/Provider'

import ModalAlt from '../ModalAlt'

import { AwsSettings, GcpSettings } from './ProviderSettings'

// TODO: Replace when api updated
type CloudProviderSettingsAttributes = SettingsTemp & {
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

export function UpdateProviderModal({
  provider,
  open,
  onClose,
  refetch,
}: {
  provider: ClusterProviderFragment
  open: boolean
  onClose: () => void
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const closeModal = useCallback(() => onClose(), [onClose])
  const { id, cloud } = provider

  const [providerSettings, updateProviderSettings] = useReducer(
    updateSettings,
    {}
  )

  let disabled = false

  switch (cloud) {
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
      //  TODO: Add disabled conditions once azure support is added to api
      disabled = true
      break
  }

  const [mutation, { loading, error }] = useUpdateClusterProviderMutation({
    variables: {
      id,
      attributes: {
        cloudSettings: {
          [cloud]: providerSettings[cloud],
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

  switch (cloud) {
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
      header={`Update ${getProviderName(cloud)} provider: ${provider.name}`}
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
            Update
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
        {settings}
      </div>
      {error && (
        <GqlError
          header="Problem updating provider"
          error={error}
        />
      )}
    </ModalAlt>
  )
}

export function UpdateProvider({
  provider,
  refetch,
}: {
  provider: ClusterProviderFragment
  refetch: Nullable<() => void>
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <IconFrame
        clickable
        tooltip="Configure provider"
        icon={<GearTrainIcon />}
        onClick={() => {
          setIsOpen(true)
        }}
      />
      <ModalMountTransition open={isOpen}>
        <UpdateProviderModal
          provider={provider}
          refetch={refetch}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
