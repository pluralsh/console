import { Button, Card, Flex, usePrevious } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  ServiceUpdateAttributes,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useUpdateState } from 'components/hooks/useUpdateState'
import styled from 'styled-components'
import { ChartUpdate } from '../../ServiceSettings'
import { Overline } from 'components/cd/utils/PermissionsModal'
import isEmpty from 'lodash/isEmpty'
import { isNonNullable } from 'utils/isNonNullable'
import { ServiceSettingsHelmValues } from '../../deployModal/DeployServiceSettingsHelmValues'
import { useServiceContext } from '../ServiceDetails'
import { useLogin } from 'components/contexts'

export function ServiceHelmSettings() {
  const { me } = useLogin()
  const isAdmin = !!me?.roles?.admin
  const { service } = useServiceContext()
  const prevServiceId = usePrevious(service.id)
  const [helmValueErrors, setHelmValueErrors] = useState(false)
  const filteredValuesFiles =
    service?.helm?.valuesFiles?.filter(isNonNullable) ?? []

  const {
    state,
    update: updateState,
    hasUpdates,
    reset,
  } = useUpdateState({
    helmChart: service.helm?.chart,
    helmVersion: service.helm?.version,
    helmValues: service?.helm?.values,
    helmValuesFiles: !isEmpty(filteredValuesFiles) ? filteredValuesFiles : [''],
  })

  useEffect(() => {
    if (service.id !== prevServiceId) reset()
  }, [prevServiceId, reset, service.id])

  const attributes = useMemo(() => {
    const helm =
      state.helmChart && state.helmVersion
        ? {
            chart: state.helmChart,
            version: state.helmVersion,
            values: state.helmValues ?? '',
            valuesFiles: state.helmValuesFiles?.filter(isNonNullable) ?? [],
          }
        : null
    let attributes: ServiceUpdateAttributes = {}

    if (helm) attributes = { helm, ...attributes }

    return attributes
  }, [state])

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: service.id,
      attributes,
    },
    onCompleted: ({ updateServiceDeployment }) => {
      const { helm } = updateServiceDeployment ?? {}
      updateState({
        helmChart: helm?.chart,
        helmVersion: helm?.version,
        helmValues: helm?.values,
        helmValuesFiles: !isEmpty(filteredValuesFiles)
          ? filteredValuesFiles
          : [''],
      })
    },
  })

  const formIsValid = !!(
    state.helmChart &&
    state.helmVersion &&
    !helmValueErrors
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        mutation()
      }}
    >
      <WrapperCardSC>
        {error && (
          <GqlError
            error={error}
            header="Failed to update service"
          />
        )}
        <Flex
          direction="column"
          gap="medium"
        >
          <Flex
            justify="space-between"
            align="center"
          >
            <Overline>helm settings</Overline>
          </Flex>
          <ChartUpdate
            repo={service.helm?.repository}
            state={state}
            updateState={updateState}
          />
          {isAdmin && (
            <ServiceSettingsHelmValues
              helmValues={state.helmValues ?? ''}
              setHelmValues={(next) =>
                updateState({
                  helmValues:
                    typeof next === 'function'
                      ? next(state.helmValues ?? '')
                      : next,
                })
              }
              helmValuesFiles={state.helmValuesFiles}
              setHelmValuesFiles={(next) =>
                updateState({
                  helmValuesFiles:
                    typeof next === 'function'
                      ? next(state.helmValuesFiles)
                      : next,
                })
              }
              setHelmValuesErrors={setHelmValueErrors}
              options={{ variant: 'large' }}
            />
          )}
        </Flex>
        <Flex
          gap="medium"
          justify="flex-end"
        >
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
          <Button
            primary
            type="submit"
            loading={loading}
            disabled={!hasUpdates || !formIsValid || helmValueErrors}
          >
            Save
          </Button>
        </Flex>
      </WrapperCardSC>
    </form>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
}))
