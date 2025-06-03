import { Button, Switch } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  ServiceDeploymentsRowFragment,
  ServiceUpdateAttributes,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { FormEvent, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useUpdateState } from 'components/hooks/useUpdateState'

import ModalAlt from '../ModalAlt'

import {
  ServiceGitFolderField,
  ServiceGitRefField,
} from './deployModal/DeployServiceSettingsGit'
import { ChartForm } from './deployModal/DeployServiceSettingsHelm'

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
    helmUrl: serviceDeployment.helm?.url,
    helmChart: serviceDeployment.helm?.chart ?? '',
    helmVersion: serviceDeployment.helm?.version ?? '',
    protect: !!serviceDeployment.protect,
  })

  const attributes = useMemo(() => {
    const git =
      state.gitRef && state.gitFolder
        ? { folder: state.gitFolder, ref: state.gitRef }
        : null
    const helm =
      state.helmChart && state.helmVersion
        ? {
            ...(state.helmUrl ? { url: state.helmUrl } : {}),
            chart: state.helmChart,
            version: state.helmVersion,
          }
        : null
    let attributes: ServiceUpdateAttributes = { protect: state.protect }

    if (git) {
      attributes = { git, ...attributes }
    }
    if (helm) {
      attributes = { helm, ...attributes }
    }

    return attributes
  }, [state])

  const [updateService, { loading, error }] =
    useUpdateServiceDeploymentMutation({
      variables: {
        id: serviceDeployment.id,
        attributes,
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

  const inputRef = useRef<HTMLInputElement>(undefined)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update service"
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
        {serviceDeployment.repository && (
          <>
            <ServiceGitRefField
              value={state.gitRef}
              setValue={(ref) => updateState({ gitRef: ref })}
            />
            <ServiceGitFolderField
              value={state.gitFolder}
              onChange={(e) => {
                updateState({ gitFolder: e.currentTarget.value })
              }}
            />
          </>
        )}
        {serviceDeployment.helm?.chart && (
          <ChartForm
            url={state.helmUrl}
            setUrl={(url) => updateState({ helmUrl: url })}
            chart={state.helmChart}
            setChart={(chart) => updateState({ helmChart: chart })}
            version={state.helmVersion}
            setVersion={(vsn) => updateState({ helmVersion: vsn })}
          />
        )}
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
