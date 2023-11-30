import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  ListIcon,
  PadlockLockedIcon,
  Stepper,
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

import {
  RepoKind,
  RepoKindSelector,
} from 'components/cd/utils/RepoKindSelector'

import ModalAlt from '../../ModalAlt'

import { DeployServiceSettingsGit } from './DeployServiceSettingsGit'
import { DeployServiceSettingsBasic } from './DeployServiceSettingsBasic'
import {
  DeployServiceSettingsSecrets,
  Secret,
} from './DeployServiceSettingsSecrets'
import DeployServiceSettingsHelm from './DeployServiceSettingsHelm'
import { DeployServiceSettingsHelmValues } from './DeployServiceSettingsHelmValues'

enum FormState {
  Initial = 'initial',
  Repository = 'repository',
  HelmValues = 'helmValues',
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
    key: FormState.Repository,
    stepTitle: <StepTitle>Repository</StepTitle>,
    IconComponent: GitHubIcon,
    ...stepBase,
  },
  {
    key: FormState.HelmValues,
    stepTitle: <StepTitle>Helm values</StepTitle>,
    IconComponent: ListIcon,
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
  const [helmValues, setHelmValues] = useState<Secret[]>([
    { name: '', value: '' },
  ])
  const [helmValuesErrors, setHelmValuesErrors] = useState(false)
  const [repoKind, setRepoKind] = useState(RepoKind.Git)

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
  const allowGoToRepo = formState === FormState.Initial && initialFormValid
  const gitSettingsValid =
    repoKind === RepoKind.Helm
      ? chart && version && repository
      : repositoryId && gitFolder && gitRef
  const allowGoToHelmValues =
    formState === FormState.Repository &&
    initialFormValid &&
    repoKind === RepoKind.Helm &&
    gitSettingsValid
  const allowGoToSecrets =
    (formState === FormState.Repository &&
      initialFormValid &&
      repoKind === RepoKind.Git &&
      gitSettingsValid) ||
    (formState === FormState.HelmValues && !helmValuesErrors)

  const allowDeploy =
    formState === FormState.Secrets &&
    initialFormValid &&
    !secretsErrors &&
    !mutationLoading

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (allowGoToRepo) {
        setFormState(FormState.Repository)
      } else if (allowGoToHelmValues) {
        setFormState(FormState.HelmValues)
      } else if (allowGoToSecrets) {
        setFormState(FormState.Secrets)
      } else if (allowDeploy) {
        mutation()
      }
    },
    [
      allowGoToRepo,
      allowGoToHelmValues,
      allowGoToSecrets,
      allowDeploy,
      mutation,
    ]
  )

  const repos = mapExistingNodes(reposData?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )
  const finalStepperSteps =
    repoKind === RepoKind.Helm
      ? stepperSteps
      : stepperSteps.filter((step) => step.key !== FormState.HelmValues)
  const currentStepIndex = stepperSteps.findIndex(
    (step) => step.key === formState
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
                  setFormState(FormState.Repository)
                }}
              >
                Go back
              </Button>
            </>
          ) : formState === FormState.Repository ? (
            <>
              {repoKind === RepoKind.Git ? (
                <Button
                  type="submit"
                  disabled={!allowGoToSecrets}
                  primary
                >
                  Add secrets
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!allowGoToHelmValues}
                  primary
                >
                  Add helm values
                </Button>
              )}
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
          ) : formState === FormState.HelmValues ? (
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
                  setFormState(FormState.Repository)
                }}
              >
                Go back
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              disabled={!allowGoToRepo}
              primary
            >
              Select repository
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
          paddingBottom:
            formState === FormState.Repository ? 0 : theme.spacing.medium,
        }}
      >
        <Stepper
          compact
          steps={finalStepperSteps}
          stepIndex={currentStepIndex}
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
        ) : formState === FormState.Repository ? (
          <RepoKindSelector
            onKindChange={setRepoKind}
            selectedKind={repoKind}
          >
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.medium,
              }}
            >
              {repoKind === RepoKind.Helm ? (
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
              )}
            </div>
          </RepoKindSelector>
        ) : formState === FormState.HelmValues ? (
          <DeployServiceSettingsHelmValues
            helmValues={helmValues}
            setHelmValues={setHelmValues}
            setHelmValuesErrors={setHelmValuesErrors}
          />
        ) : (
          <>
            <DeployServiceSettingsSecrets
              secrets={secrets}
              setSecrets={setSecrets}
              setSecretsErrors={setSecretsErrors}
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
