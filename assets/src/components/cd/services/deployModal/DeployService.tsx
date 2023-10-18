import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  PadlockLockedIcon,
  Stepper,
} from '@pluralsh/design-system'
import {
  useClustersTinyQuery,
  useCreateServiceDeploymentMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { mapExistingNodes } from 'utils/graphql'

import ModalAlt from '../../ModalAlt'

import { DeployServiceSettingsGit } from './DeployServiceSettingsGit'
import { DeployServiceSettingsBasic } from './DeployServiceSettingsBasic'
import {
  DeployServiceSettingsSecrets,
  Secret,
} from './DeployServiceSettingsSecrets'

enum FormState {
  Initial = 'initial',
  Git = 'git',
  Secrets = 'secrets',
}

const stepperSteps = [
  {
    key: FormState.Initial,
    stepTitle: 'Service props',
    IconComponent: GearTrainIcon,
  },
  {
    key: FormState.Git,
    stepTitle: 'Repository',
    IconComponent: GitHubIcon,
  },
  {
    key: FormState.Secrets,
    stepTitle: 'Secrets',
    IconComponent: PadlockLockedIcon,
  },
]

export function DeployServiceModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const [formState, setFormState] = useState<FormState>(FormState.Initial)
  const [clusterId, setClusterId] = useState('')
  const [name, setName] = useState('')
  const [repositoryId, setRepositoryId] = useState('')
  const [gitFolder, setGitFolder] = useState('')
  const [gitRef, setGitRef] = useState('')
  const [namespace, setNamespace] = useState('')
  const [secrets, setSecrets] = useState<Secret[]>([{ name: '', value: '' }])
  const [secretsErrors, setSecretsErrors] = useState(false)

  const configuration = useMemo(() => {
    const cfg: Record<string, string> = {}

    for (const { name, value } of secrets) {
      if (name) {
        cfg[name] = value
      }
    }

    return Object.entries(cfg).map(([name, value]) => ({
      name,
      value,
    }))
  }, [secrets])

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateServiceDeploymentMutation({
      variables: {
        clusterId,
        attributes: {
          repositoryId,
          name,
          namespace,
          git: { ref: gitRef, folder: gitFolder },
          configuration,
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  const { data: reposData } = useGitRepositoriesQuery()

  const { data: clustersData } = useClustersTinyQuery()
  const clusters = useMemo(
    () => mapExistingNodes(clustersData?.clusters),
    [clustersData?.clusters]
  )

  const initialFormValid = name && namespace && clusterId
  const allowGoToGit = formState === FormState.Initial && initialFormValid
  const gitSettingsValid = repositoryId && gitFolder && gitRef
  const allowGoToSecrets =
    formState === FormState.Git && initialFormValid && gitSettingsValid

  const allowDeploy =
    formState === FormState.Secrets &&
    initialFormValid &&
    !secretsErrors &&
    !mutationLoading

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (allowGoToGit) {
        setFormState(FormState.Git)
      } else if (allowGoToSecrets) {
        setFormState(FormState.Secrets)
      } else if (allowDeploy) {
        mutation()
      }
    },
    [allowGoToGit, allowGoToSecrets, allowDeploy, mutation]
  )

  const repos = mapExistingNodes(reposData?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  const initialLoading = !repos || !clusters

  return (
    <ModalAlt
      css={{ '&& .form': { gap: 0 } }}
      header="Deploy service"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          {formState === FormState.Secrets ? (
            <>
              <Button
                type="submit"
                disabled={!allowDeploy}
                loading={mutationLoading}
                primary
              >
                Deploy service
              </Button>
              <Button
                secondary
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setFormState(FormState.Git)
                }}
              >
                Go back
              </Button>
            </>
          ) : formState === FormState.Git ? (
            <>
              <Button
                type="submit"
                disabled={!allowGoToSecrets}
                primary
              >
                Add secrets
              </Button>
              <Button
                secondary
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setFormState(FormState.Initial)
                }}
              >
                Go back
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              disabled={!allowGoToGit}
              primary
            >
              Select Git repository
            </Button>
          )}
          <Button
            type="button"
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          paddingTop: theme.spacing.medium,
          paddingBottom: theme.spacing.large,
        }}
      >
        <Stepper
          steps={stepperSteps}
          stepIndex={
            formState === FormState.Initial
              ? 0
              : formState === FormState.Git
              ? 1
              : 2
          }
        />
      </div>
      <div
        css={{
          paddingBottom: theme.spacing.large,
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
        }}
      >
        {initialLoading ? (
          <LoadingIndicator />
        ) : formState === FormState.Initial ? (
          <DeployServiceSettingsBasic
            {...{
              name,
              setName,
              namespace,
              setNamespace,
              clusterId,
              setClusterId,
              clusters,
            }}
          />
        ) : formState === FormState.Git ? (
          <DeployServiceSettingsGit
            {...{
              repos,
              repositoryId,
              setRepositoryId,
              gitRef,
              setGitRef,
              gitFolder,
              setGitFolder,
            }}
          />
        ) : (
          <>
            <DeployServiceSettingsSecrets
              secrets={secrets}
              setSecretsErrors={setSecretsErrors}
              setSecrets={setSecrets}
            />
            {mutationError && (
              <GqlError
                header="Problem deploying service"
                error={mutationError}
              />
            )}
          </>
        )}
      </div>
    </ModalAlt>
  )
}
