import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, usePrevious } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import isEmpty from 'lodash/isEmpty'

import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  SERVICE_PARAM_ID,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import {
  HelmConfigAttributes,
  ServiceUpdateAttributes,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'

import { isNonNullable } from 'utils/isNonNullable'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { GqlError } from 'components/utils/Alert'
import { useUpdateState } from 'components/hooks/useUpdateState'

import { ServiceSettingsHelmValues } from '../deployModal/DeployServiceSettingsHelmValues'

import { useServiceContext } from './ServiceDetails'

export default function ServiceHelm() {
  const theme = useTheme()
  const navigate = useNavigate()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const { service } = useServiceContext()
  const prevServiceId = usePrevious(service.id)

  const filteredValuesFiles = service?.helm?.valuesFiles?.filter(isNonNullable)

  const {
    state,
    update: updateState,
    hasUpdates,
    reset,
  } = useUpdateState({
    helmValues: service?.helm?.values ?? '',
    helmValuesFiles:
      filteredValuesFiles && !isEmpty(filteredValuesFiles)
        ? filteredValuesFiles
        : [''],
  })

  useEffect(() => {
    if (service.id !== prevServiceId) {
      reset()
    }
  }, [prevServiceId, reset, service.id])
  const [errors, setErrors] = useState(false)
  const attributes = useMemo<Pick<ServiceUpdateAttributes, 'helm'>>(() => {
    const helm: Pick<HelmConfigAttributes, 'values' | 'valuesFiles'> = {
      values: state.helmValues || '',
      valuesFiles: (state.helmValuesFiles || []).filter((value) => !!value),
    }

    return { helm }
  }, [state])

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: serviceId || '',
      attributes,
    },
    onCompleted: (e) => {
      updateState({
        helmValues: e.updateServiceDeployment?.helm?.values ?? '',
        helmValuesFiles: e.updateServiceDeployment?.helm?.valuesFiles?.filter(
          isNonNullable
        ) ?? [''],
      })
    },
  })

  if (!service) {
    navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`)

    return null
  }
  if (!service.helm) {
    navigate(
      getServiceDetailsPath({
        serviceId: service.id,
        clusterId: service.cluster?.id,
      })
    )

    return null
  }

  return (
    <ScrollablePage
      heading="Helm"
      scrollable={false}
    >
      {error && (
        <GqlError
          error={error}
          header="Failed to update service"
        />
      )}
      <form
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
        onSubmit={(e) => {
          e.preventDefault()
          mutation()
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
          options={{ variant: 'large' }}
        />
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.medium,
          }}
        >
          <Button
            primary
            type="submit"
            loading={loading}
            disabled={!hasUpdates && !errors}
          >
            Save
          </Button>
          <Button
            secondary
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              reset()
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    </ScrollablePage>
  )
}
