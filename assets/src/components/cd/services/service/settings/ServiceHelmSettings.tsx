import { Button, Card, Flex, usePrevious } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { useUpdateServiceDeploymentMutation } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { ChartForm } from '../../deployModal/DeployServiceSettingsHelm'
import { ServiceSettingsHelmValues } from '../../deployModal/DeployServiceSettingsHelmValues'
import { useServiceContext } from '../ServiceDetails'

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
    ...(service.helm?.url ? { helmUrl: service.helm?.url } : {}),
    helmChart: service.helm?.chart,
    helmVersion: service.helm?.version,
    helmValues: service?.helm?.values,
    helmValuesFiles: !isEmpty(filteredValuesFiles) ? filteredValuesFiles : [''],
  })

  useEffect(() => {
    if (service.id !== prevServiceId) reset()
  }, [prevServiceId, reset, service.id])

  const attributes = useMemo(() => {
    return state.helmChart && state.helmVersion
      ? {
          helm: {
            ...(state.helmUrl ? { url: state.helmUrl } : {}),
            chart: state.helmChart,
            version: state.helmVersion,
            values: state.helmValues ?? '',
            valuesFiles: state.helmValuesFiles?.filter(isNonNullable) ?? [],
          },
        }
      : {}
  }, [state])

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: service.id,
      attributes,
    },
    onCompleted: ({ updateServiceDeployment }) => {
      const { helm } = updateServiceDeployment ?? {}
      updateState({
        ...(state.helmUrl ? { url: state.helmUrl } : {}),
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
          <ChartForm
            url={state.helmUrl}
            setUrl={(url) => updateState({ helmUrl: url })}
            chart={state.helmChart ?? ''}
            setChart={(chart) => updateState({ helmChart: chart })}
            version={state.helmVersion ?? ''}
            setVersion={(vsn) => updateState({ helmVersion: vsn })}
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
            disabled={!hasUpdates || !formIsValid}
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
