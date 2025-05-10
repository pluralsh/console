import { Button, FormField } from '@pluralsh/design-system'
import {
  useGitRepositoriesQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { FormEventHandler, useCallback } from 'react'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { useGlobalSettingsContext } from 'components/settings/global/GlobalSettings'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { RepositorySelector } from '../../cd/services/deployModal/DeployServiceSettingsGit'

export function GlobalSettingsRepositories() {
  const theme = useTheme()
  const { deploymentSettings, refetch } = useGlobalSettingsContext()

  const { artifactRepository, deployerRepository } = deploymentSettings
  const { data: reposData } = useGitRepositoriesQuery()
  const formState = useUpdateState({
    artifactRepositoryId: artifactRepository?.id,
    deployerRepositoryId: deployerRepository?.id,
  })
  const [updateSettings, { loading: mutationLoading, error: mutationError }] =
    useUpdateDeploymentSettingsMutation()

  const repositories = mapExistingNodes(reposData?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )
  const allowSubmit = formState.hasUpdates

  const onSubmit = useCallback<FormEventHandler>(
    (e) => {
      e.preventDefault()
      if (allowSubmit) {
        updateSettings({
          variables: {
            attributes: {
              artifactRepositoryId: formState.state.artifactRepositoryId,
              deployerRepositoryId: formState.state.deployerRepositoryId,
            },
          },
          onCompleted: (data) => {
            const { artifactRepository, deployerRepository } =
              data?.updateDeploymentSettings || {}

            formState.update({
              ...(artifactRepository
                ? { artifactRepositoryId: artifactRepository.id }
                : {}),
              ...(deployerRepository
                ? { deployerRepositoryId: deployerRepository.id }
                : {}),
            })
            refetch()
          },
        })
      }
    },
    [allowSubmit, formState, refetch, updateSettings]
  )

  return (
    <ScrollablePage heading="Repositories">
      <form
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
        onSubmit={onSubmit}
      >
        {reposData && deploymentSettings ? (
          <>
            {deployerRepository && (
              <FormField label="Deployment operator repository">
                <RepositorySelector
                  repositoryId={formState.state.deployerRepositoryId}
                  setRepositoryId={(id) =>
                    formState.update({ deployerRepositoryId: id })
                  }
                  repositories={repositories}
                />
              </FormField>
            )}
            {artifactRepository && (
              <FormField label="Scaffolds repository">
                <RepositorySelector
                  repositoryId={formState.state.artifactRepositoryId}
                  setRepositoryId={(id) =>
                    formState.update({ artifactRepositoryId: id })
                  }
                  repositories={repositories}
                />
              </FormField>
            )}
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
                flexDirection: 'row-reverse',
              }}
            >
              <Button
                primary
                type="submit"
                disabled={!allowSubmit}
                loading={mutationLoading}
              >
                Save
              </Button>
              <Button
                secondary
                type="button"
                onClick={() => formState.reset()}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <LoadingIndicator />
        )}
        {mutationError && <GqlError error={mutationError} />}
      </form>
    </ScrollablePage>
  )
}
