import { Button, Switch } from '@pluralsh/design-system'
import {
  ServiceDeploymentsRowFragment,
  ServiceUpdateAttributes,
  useHelmRepositoryQuery,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useMemo, useRef } from 'react'
import { GqlError } from 'components/utils/Alert'

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

function ChartUpdate({ repo, state, updateState }) {
  const { data } = useHelmRepositoryQuery({
    variables: {
      name: repo?.name || '',
      namespace: repo?.namespace || '',
    },
    skip: !repo?.name || !repo?.namespace,
  })

  return (
    <ChartForm
      charts={data?.helmRepository?.charts || []}
      chart={state.helmChart}
      setChart={(chart) => updateState({ helmChart: chart })}
      version={state.helmVersion}
      setVersion={(vsn) => updateState({ helmVersion: vsn })}
    />
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
        ? { chart: state.helmChart, version: state.helmVersion }
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

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  console.log('serviceSettings', serviceDeployment)

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
        {serviceDeployment.repository && (
          <>
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
          </>
        )}
        {serviceDeployment.helm?.chart && (
          <ChartUpdate
            repo={serviceDeployment.helm?.repository}
            state={state}
            updateState={updateState}
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
