import {
  Button,
  Card,
  Flex,
  Switch,
  usePrevious,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  ServiceUpdateAttributes,
  useUpdateServiceDeploymentMutation,
} from 'generated/graphql'
import { useEffect, useMemo } from 'react'
import { useUpdateState } from 'components/hooks/useUpdateState'
import styled from 'styled-components'
import {
  ServiceGitFolderField,
  ServiceGitRefField,
} from '../../deployModal/DeployServiceSettingsGit'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { useServiceContext } from '../ServiceDetails'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getServiceSettingsPath,
  SERVICE_SETTINGS_HELM_REL_PATH,
} from '../../../../../routes/cdRoutesConsts.tsx'

export function ServiceGitSettings() {
  const { service } = useServiceContext()
  const prevServiceId = usePrevious(service.id)
  const { flowId } = useParams()
  const navigate = useNavigate()

  const {
    state,
    update: updateState,
    hasUpdates,
    reset,
  } = useUpdateState({
    protect: !!service.protect,
    gitRef: service.git?.ref,
    gitFolder: service.git?.folder,
  })

  useEffect(() => {
    if (service.id !== prevServiceId) reset()
  }, [prevServiceId, reset, service.id])

  const attributes = useMemo(() => {
    const git =
      state.gitRef && state.gitFolder
        ? { folder: state.gitFolder, ref: state.gitRef }
        : null
    let attributes: ServiceUpdateAttributes = { protect: state.protect }

    if (git) attributes = { git, ...attributes }

    return attributes
  }, [state])

  const [mutation, { loading, error }] = useUpdateServiceDeploymentMutation({
    variables: {
      id: service.id,
      attributes,
    },
    onCompleted: ({ updateServiceDeployment }) => {
      const { git, protect } = updateServiceDeployment ?? {}
      updateState({
        protect: !!protect,
        gitRef: git?.ref,
        gitFolder: git?.folder,
      })
    },
  })

  const hasGitRepo = !!service.repository
  const formIsValid = !hasGitRepo || !!(state.gitRef && state.gitFolder)

  useEffect(() => {
    if (hasGitRepo) return
    navigate(
      getServiceSettingsPath({
        flowId,
        clusterId: service?.cluster?.id,
        serviceId: service?.id,
        isRelative: false,
        subTab: SERVICE_SETTINGS_HELM_REL_PATH,
      })
    )
  }, [hasGitRepo, navigate, service, flowId])

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
            <Overline>git settings</Overline>
            <Switch
              checked={state.protect}
              onChange={(checked) => updateState({ protect: checked })}
            >
              Protect from deletion
            </Switch>
          </Flex>
          {hasGitRepo && (
            <>
              <ServiceGitRefField
                value={state.gitRef ?? ''}
                required
                setValue={(v) => updateState({ gitRef: v })}
              />
              <ServiceGitFolderField
                value={state.gitFolder ?? ''}
                required
                onChange={(e) => {
                  updateState({ gitFolder: e.currentTarget.value })
                }}
              />
            </>
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
