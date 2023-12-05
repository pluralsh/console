import {
  ServiceUpdateAttributes,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useEffect, useMemo } from 'react'
import { Button, Switch, usePrevious } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'

import { useUpdateState } from 'components/hooks/useUpdateState'

import { useTheme } from 'styled-components'

import { ChartUpdate } from '../ServiceSettings'
import {
  ServiceGitFolderField,
  ServiceGitRefField,
} from '../deployModal/DeployServiceSettingsGit'

import { useServiceContext } from './ServiceDetails'

export default function ServiceSettings() {
  const theme = useTheme()
  const { service } = useServiceContext()
  const prevServiceId = usePrevious(service.id)

  const {
    state,
    update: updateState,
    hasUpdates,
    reset,
  } = useUpdateState({
    gitRef: service.git?.ref ?? '',
    gitFolder: service.git?.folder ?? '',
    helmChart: service.helm?.chart ?? '',
    helmVersion: service.helm?.version ?? '',
    protect: !!service.protect,
  })

  useEffect(() => {
    if (service.id !== prevServiceId) {
      reset()
    }
  }, [prevServiceId, reset, service.id])

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

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: service.id,
      attributes,
    },
    onCompleted: ({ updateServiceDeployment }) => {
      const { git, helm, protect } = updateServiceDeployment ?? {}

      updateState({
        gitRef: git?.ref ?? '',
        gitFolder: git?.folder ?? '',
        helmChart: helm?.chart ?? '',
        helmVersion: helm?.version ?? '',
        protect: !!protect,
      })
    },
  })
  const hasGitRepo = !!service.repository
  const hasHelmRepo = !!service.helm?.chart

  const formIsValid =
    (!hasGitRepo || !!(state.gitRef && state.gitFolder)) &&
    (!hasHelmRepo || !!(state.helmChart && state.helmVersion))

  return (
    <ScrollablePage
      heading="Helm"
      scrollable
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
          rowGap: theme.spacing.large,
        }}
        onSubmit={(e) => {
          e.preventDefault()
          mutation()
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          {hasGitRepo && (
            <>
              <ServiceGitRefField
                value={state.gitRef}
                required
                onChange={(e) => {
                  updateState({ gitRef: e.currentTarget.value })
                }}
              />
              <ServiceGitFolderField
                value={state.gitFolder}
                required
                onChange={(e) => {
                  updateState({ gitFolder: e.currentTarget.value })
                }}
              />
            </>
          )}
          {hasHelmRepo && (
            <ChartUpdate
              repo={service.helm?.repository}
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
            disabled={!hasUpdates || !formIsValid}
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
