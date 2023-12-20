import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  GitPullIcon,
  ListIcon,
  PadlockLockedIcon,
  Stepper,
} from '@pluralsh/design-system'
import { Priority, useRegisterActions } from 'kbar'

import {
  NamespacedName,
  useCreateServiceDeploymentMutation,
  useGitRepositoriesQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  RepoKind,
  RepoKindSelector,
} from 'components/cd/utils/RepoKindSelector'
import ModalAlt from 'components/cd/ModalAlt'

import { PaletteSection } from 'components/CommandPalette'

import { DeployServiceSettingsGit } from './DeployServiceSettingsGit'
import { DeployServiceSettingsBasic } from './DeployServiceSettingsBasic'
import {
  DeployServiceSettingsSecrets,
  Secret,
} from './DeployServiceSettingsSecrets'
import DeployServiceSettingsHelm from './DeployServiceSettingsHelm'
import { ServiceSettingsHelmValues } from './DeployServiceSettingsHelmValues'

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

function sanitizeSecrets(secrets: Secret[]) {
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
}

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
  const [helmRepository, setHelmRepository] = useState<NamespacedName | null>(
    null
  )
  const [chart, setChart] = useState('')
  const [version, setVersion] = useState('')
  const [gitFolder, setGitFolder] = useState('')
  const [gitRef, setGitRef] = useState('')
  const [namespace, setNamespace] = useState('')
  const [secrets, setSecrets] = useState<Secret[]>([{ name: '', value: '' }])
  const [secretsErrors, setSecretsErrors] = useState(false)
  const [helmValuesFiles, setHelmValuesFiles] = useState<string[]>([''])
  const [helmValues, setHelmValues] = useState('')
  const [helmValuesErrors, setHelmValuesErrors] = useState(false)
  const [repoTab, setRepoTab] = useState(RepoKind.Git)

  const initialFormValid = !!(name && namespace && clusterId)
  const allowGoToRepo = formState === FormState.Initial && initialFormValid
  const hasHelmRepo = !!helmRepository
  const hasGitRepo = !!repositoryId

  const gitSettingsValid = hasGitRepo
    ? !!(repositoryId && gitFolder && gitRef)
    : hasHelmRepo
  const helmSettingsValid = hasHelmRepo
    ? !!(chart && version && helmRepository)
    : hasGitRepo
  const repoSettingsValid = helmSettingsValid && gitSettingsValid

  const allowGoToHelmValues =
    formState === FormState.Repository &&
    initialFormValid &&
    hasHelmRepo &&
    repoSettingsValid
  const allowGoToSecrets =
    (formState === FormState.Repository &&
      initialFormValid &&
      repoSettingsValid) ||
    (formState === FormState.HelmValues && !helmValuesErrors)

  const [mutation, { loading: mutationLoading, error: mutationError }] =
    useCreateServiceDeploymentMutation({
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })

  const { data: reposData } = useGitRepositoriesQuery()

  const allowDeploy =
    formState === FormState.Secrets &&
    initialFormValid &&
    repoSettingsValid &&
    (hasHelmRepo ? !helmValuesErrors : true) &&
    !secretsErrors &&
    !mutationLoading

  const deployService = useCallback(() => {
    const helm =
      hasHelmRepo && helmSettingsValid
        ? {
            repository: helmRepository,
            chart,
            version,
            values: helmValues || null,
            valuesFiles: helmValuesFiles.filter((value) => !!value),
          }
        : null

    const git =
      hasGitRepo && gitSettingsValid ? { ref: gitRef, folder: gitFolder } : null

    const configuration = sanitizeSecrets(secrets)
    const variables = {
      clusterId,
      attributes: {
        repositoryId,
        name,
        namespace,
        git,
        helm,
        configuration,
      },
    }

    mutation({ variables })
  }, [
    chart,
    clusterId,
    gitFolder,
    gitRef,
    gitSettingsValid,
    hasGitRepo,
    hasHelmRepo,
    helmRepository,
    helmSettingsValid,
    helmValues,
    helmValuesFiles,
    mutation,
    name,
    namespace,
    repositoryId,
    secrets,
    version,
  ])

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
        deployService()
      }
    },
    [
      allowGoToRepo,
      allowGoToHelmValues,
      allowGoToSecrets,
      allowDeploy,
      deployService,
    ]
  )

  const repos = mapExistingNodes(reposData?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )
  const finalStepperSteps = hasHelmRepo
    ? stepperSteps
    : stepperSteps.filter((step) => step.key !== FormState.HelmValues)
  const currentStepIndex = stepperSteps.findIndex(
    (step) => step.key === formState
  )

  const initialLoading = !repos

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
                  setFormState(
                    hasHelmRepo ? FormState.HelmValues : FormState.Repository
                  )
                }}
              >
                Go back
              </Button>
            </>
          ) : formState === FormState.Repository ? (
            <>
              {!hasHelmRepo ? (
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
            }}
          />
        ) : formState === FormState.Repository ? (
          <RepoKindSelector
            onKindChange={setRepoTab}
            selectedKind={repoTab}
            validKinds={{
              [RepoKind.Git]: hasGitRepo && gitSettingsValid,
              [RepoKind.Helm]: hasHelmRepo && helmSettingsValid,
            }}
          >
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.medium,
              }}
            >
              {repoTab === RepoKind.Helm ? (
                <DeployServiceSettingsHelm
                  {...{
                    repository: helmRepository,
                    setRepository: setHelmRepository,
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
          <ServiceSettingsHelmValues
            helmValues={helmValues}
            setHelmValues={setHelmValues}
            helmValuesFiles={helmValuesFiles}
            setHelmValuesFiles={setHelmValuesFiles}
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
  const kbarActions = useMemo(
    () => [
      {
        section: PaletteSection.Actions,
        id: `deploy-service`,
        priority: Priority.HIGH,
        name: `Deploy new service`,
        icon: <GitPullIcon />,
        shortcut: [],
        perform: () => {
          setIsOpen(true)
        },
      },
    ],
    []
  )

  useRegisterActions(kbarActions)

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
