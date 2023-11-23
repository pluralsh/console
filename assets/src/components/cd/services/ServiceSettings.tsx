import { Button, Switch } from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef } from 'react'
import { GqlError } from 'components/utils/Alert'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useUpdateState } from 'components/hooks/useUpdateState'

import ModalAlt from '../ModalAlt'

import {
  ServiceGitFolderField,
  ServiceGitRefField,
} from './deployModal/DeployServiceSettingsGit'

export function ServiceSettings({
  serviceDeployment,
  refetch,
  open,
  onClose,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <ModalMountTransition open={open}>
      <ModalForm
        serviceDeployment={serviceDeployment}
        refetch={refetch}
        open={open}
        onClose={onClose}
      />
    </ModalMountTransition>
  )
}

export function ModalForm({
  serviceDeployment,
  open,
  onClose,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({
    gitRef: serviceDeployment.git?.ref ?? '',
    gitFolder: serviceDeployment.git?.folder ?? '',
    protect: !!serviceDeployment.protect,
  })

  const [updateService, { loading, error }] =
    useUpdateServiceDeploymentMutation({
      variables: {
        id: serviceDeployment.id,
        attributes: {
          git: {
            folder: state.gitFolder,
            ref: state.gitRef,
          },
          protect: state.protect,
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose?.()
      },
    })
  const closeModal = useCallback(() => {
    onClose?.()
  }, [onClose])

  const disabled = !hasUpdates
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (disabled) {
        return
      }
      updateService()
    },
    [disabled, updateService]
  )

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update service"
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
          gap: theme.spacing.medium,
        }}
      >
        <ServiceGitRefField
          value={state.gitRef}
          onChange={(e) => {
            updateState({ gitRef: e.currentTarget.value })
          }}
        />
        <ServiceGitFolderField
          value={state.gitFolder}
          onChange={(e) => {
            updateState({ gitFolder: e.currentTarget.value })
          }}
        />
        <Switch
          checked={state.protect}
          onChange={(checked) => updateState({ protect: checked })}
        >
          Protect from deletion
        </Switch>
      </div>
      {error && (
        <GqlError
          header="Problem updating service"
          error={error}
        />
      )}
    </ModalAlt>
  )
}
