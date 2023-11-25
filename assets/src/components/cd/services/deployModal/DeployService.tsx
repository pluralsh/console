import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  PadlockLockedIcon,
  Stepper,
  Switch,
} from '@pluralsh/design-system'
import {
  useClustersTinyQuery,
  useCreateServiceDeploymentMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { mapExistingNodes } from 'utils/graphql'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt from '../../ModalAlt'

import { DeployServiceSettingsGit } from './DeployServiceSettingsGit'
import { DeployServiceSettingsBasic } from './DeployServiceSettingsBasic'
import {
  DeployServiceSettingsSecrets,
  Secret,
} from './DeployServiceSettingsSecrets'
import DeployServiceSettingsHelm from './DeployServiceSettingsHelm'

enum FormState {
  Initial = 'initial',
  Git = 'git',
  Helm = 'helm',
  Secrets = 'secrets',
}

const StepTitle = styled.div(({ theme }) => ({
  marginRight: theme.spacing.small,
}))

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}

const stepperSteps = [
  {
    key: FormState.Initial,
    stepTitle: <StepTitle>Service props</StepTitle>,
    IconComponent: GearTrainIcon,
    ...stepBase,
  },
  {
    key: FormState.Git,
    stepTitle: <StepTitle>Repository</StepTitle>,
    IconComponent: GitHubIcon,
    ...stepBase,
  },
  {
    key: FormState.Secrets,
    stepTitle: <StepTitle>Secrets</StepTitle>,
    IconComponent: PadlockLockedIcon,
    ...stepBase,
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
  const [repository, setRepository] = useState(null)
  const [chart, setChart] = useState('')
  const [version, setVersion] = useState('')
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

  const helm =
    repository && chart && version ? { repository, chart, version } : null
  const git = gitRef && gitFolder ? { ref: gitRef, folder: gitFolder } : null

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateServiceDeploymentMutation({
      variables: {
        clusterId,
        attributes: {
          repositoryId,
          name,
          namespace,
          git,
          helm,
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
  const gitSettingsValid =
    (repositoryId && gitFolder && gitRef) || (chart && version && repository)
  const allowGoToSecrets =
    (formState === FormState.Git || formState === FormState.Helm) &&
    initialFormValid &&
    gitSettingsValid

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
          ) : formState === FormState.Git || formState === FormState.Helm ? (
            <>
              <Button
                type="submit"
                disabled={!allowGoToSecrets}
                primary
              >
                Add secrets
              </Button>
              <Switch
                checked={formState === FormState.Helm}
                onChange={(selected) =>
                  setFormState(selected ? FormState.Helm : FormState.Git)
                }
              >
                Use Helm Source
              </Switch>
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
          display: 'flex',
          paddingBottom: theme.spacing.medium,
        }}
      >
        <Stepper
          compact
          steps={stepperSteps}
          stepIndex={
            formState === FormState.Initial
              ? 0
              : formState === FormState.Git || formState === FormState.Helm
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
        ) : formState === FormState.Helm ? (
          <DeployServiceSettingsHelm
            {...{
              repository,
              setRepository,
              chart,
              setChart,
              version,
              setVersion,
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

export function DeployService({ refetch }: { refetch: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Deploy service
      </Button>
      <ModalMountTransition open={isOpen}>
        <DeployServiceModal
          refetch={refetch}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
