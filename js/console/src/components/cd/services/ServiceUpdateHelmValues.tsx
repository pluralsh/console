import { Button } from '@pluralsh/design-system'

import isEmpty from 'lodash/isEmpty'
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'styled-components'

import {
  HelmConfigAttributes,
  ServiceDeploymentsRowFragment,
  ServiceUpdateAttributes,
  useServiceDeploymentHelmSettingsQuery,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'

import { isNonNullable } from 'utils/isNonNullable'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

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
  if (isEmpty(serviceDeployment.helm?.repository)) return null

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

function ModalForm({
  serviceDeployment,
  ...props
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
}) {
  const { data } = useServiceDeploymentHelmSettingsQuery({
    variables: { id: serviceDeployment.id },
  })

  if (!data?.serviceDeployment) {
    return <LoadingIndicator />
  }

  return (
    <ModalFormInner
      serviceDeployment={serviceDeployment}
      helmValues={data.serviceDeployment.helm?.values}
      helmValuesFiles={data.serviceDeployment.helm?.valuesFiles}
      {...props}
    />
  )
}

export function ModalFormInner({
  serviceDeployment,
  helmValues,
  helmValuesFiles,
  open,
  onClose,
  refetch,
}: {
  serviceDeployment: ServiceDeploymentsRowFragment
  helmValues: Nullable<string>
  helmValuesFiles: Nullable<Nullable<string>[]>
  open: boolean
  onClose: Nullable<() => void>
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()
  const filteredValuesFiles = helmValuesFiles?.filter(isNonNullable)

  const {
    state,
    update: updateState,
    hasUpdates,
  } = useUpdateState({
    helmValues: helmValues ?? '',
    helmValuesFiles:
      filteredValuesFiles && !isEmpty(filteredValuesFiles)
        ? filteredValuesFiles
        : [''],
  })
  const [errors, setErrors] = useState(false)

  const attributes = useMemo<Pick<ServiceUpdateAttributes, 'helm'>>(() => {
    const helm: Pick<HelmConfigAttributes, 'values' | 'valuesFiles'> = {
      values: state.helmValues || '',
      valuesFiles: (state.helmValuesFiles || []).filter((value) => !!value),
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

  const inputRef = useRef<HTMLInputElement>(undefined)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update Helm values"
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
