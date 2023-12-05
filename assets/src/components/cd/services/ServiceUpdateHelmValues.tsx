import { Button } from '@pluralsh/design-system'
import {
  HelmConfigAttributes,
  ServiceDeploymentsRowFragment,
  ServiceUpdateAttributes,
  useHelmRepositoryQuery,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GqlError } from 'components/utils/Alert'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useUpdateState } from 'components/hooks/useUpdateState'

import ModalAlt from '../ModalAlt'

import { ServiceSettingsHelmValues } from './deployModal/DeployServiceSettingsHelmValues'

export function ServiceUpdateHelmValues({
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
  const repo = serviceDeployment.helm?.repository
  const { data } = useHelmRepositoryQuery({
    variables: {
      name: repo?.name || '',
      namespace: repo?.namespace || '',
    },
    skip: !repo?.name || !repo?.namespace,
  })
  const helmRepository = data?.helmRepository as Record<string, unknown>
  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({
    helmValues: (helmRepository.values as string) ?? '',
    helmValuesFiles: (helmRepository.valuesFiles as string[]) ?? [''],
  })
  const [errors, setErrors] = useState(false)

  const attributes = useMemo<Pick<ServiceUpdateAttributes, 'helm'>>(() => {
    const helm: Pick<HelmConfigAttributes, 'values' | 'valuesFiles'> = {
      values: state.helmValues || '',
      valuesFiles: state.helmValuesFiles.filter((value) => !!value),
    }

    return { helm }
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

  const disabled = !hasUpdates && !errors
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
      header="Update Helm values"
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
        <ServiceSettingsHelmValues
          helmValues={state.helmValues}
          setHelmValues={(next) =>
            updateState({
              helmValues:
                typeof next === 'function' ? next(state.helmValues) : next,
            })
          }
          helmValuesFiles={state.helmValuesFiles}
          setHelmValuesFiles={(next) =>
            updateState({
              helmValuesFiles:
                typeof next === 'function' ? next(state.helmValuesFiles) : next,
            })
          }
          setHelmValuesErrors={setErrors}
        />
      </div>
      {error && (
        <GqlError
          header="Problem updating Helm values"
          error={error}
        />
      )}
    </ModalAlt>
  )
}
