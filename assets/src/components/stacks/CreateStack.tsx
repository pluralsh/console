import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  Stepper,
  TerminalIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { ReactNode, useCallback, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { GqlError } from '../utils/Alert'
import {
  StackEnvironmentAttributes,
  StackType,
  StacksDocument,
  useCreateStackMutation,
  useGitRepositoriesQuery,
} from '../../generated/graphql'
import {
  appendConnection,
  mapExistingNodes,
  updateCache,
} from '../../utils/graphql'
import ModalAlt from '../cd/ModalAlt'

import { ModalMountTransition } from '../utils/ModalMountTransition'

import { CreateStackBasic } from './CreateStackBasic'
import { CreateStackRepository } from './CreateStackRepository'
import CreateStackActions from './CreateStackActions'
import { CreateStackEnvironment } from './CreateStackEnvironment'

export enum FormState {
  Initial = 'initial',
  Repository = 'repository',
  Environment = 'environment',
}

const StepTitle = styled.div(({ theme }) => ({
  marginRight: theme.spacing.small,
}))

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}

export const stepperSteps = [
  {
    key: FormState.Initial,
    stepTitle: <StepTitle>Stack props</StepTitle>,
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
    key: FormState.Environment,
    stepTitle: <StepTitle>Environment</StepTitle>,
    IconComponent: TerminalIcon,
    ...stepBase,
  },
]

export default function CreateStack({
  buttonContent = 'Create stack',
  buttonProps,
}: {
  buttonProps?: ButtonProps
  buttonContent?: string | ReactNode
}) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(FormState.Initial)
  const [name, setName] = useState('')
  const [type, setType] = useState<StackType>(StackType.Terraform)
  const [image, setImage] = useState('')
  const [version, setVersion] = useState('')
  const [clusterId, setClusterId] = useState('')
  const [approval, setApproval] = useState<boolean>(false)
  const [repositoryId, setRepositoryId] = useState('')
  const [ref, setRef] = useState('')
  const [folder, setFolder] = useState('')
  const [environment, setEnvironment] = useState<StackEnvironmentAttributes[]>(
    []
  )

  // TODO: Reset form on exit.

  const initialFormValid = !!(name && type && version && clusterId)
  const repoFormValid = !!(repositoryId && ref && folder)

  const currentStepIndex = stepperSteps.findIndex(
    (step) => step.key === formState
  )

  const { data } = useGitRepositoriesQuery()
  const repos = mapExistingNodes(data?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  const [mutation, { loading, error, reset }] = useCreateStackMutation({
    variables: {
      attributes: {
        name,
        type,
        clusterId,
        approval,
        configuration: { image, version },
        repositoryId,
        git: { ref, folder },
        environment,
        // TODO: Add all props to form.
      },
    },
    onCompleted: () => close(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: StacksDocument,
        update: (prev) =>
          appendConnection(prev, data?.createStack, 'infrastructureStacks'),
      }),
  })

  const close = useCallback(() => {
    setName('')
    reset()
    setOpen(false)
  }, [reset])

  return (
    <>
      <Tooltip label="Create stack">
        <Button
          {...buttonProps}
          onClick={() => setOpen(true)}
        >
          {buttonContent}
        </Button>
      </Tooltip>
      <ModalMountTransition open={open}>
        <ModalAlt
          header="Create infrastracture stack"
          portal
          asForm
          open={open}
          onClose={() => close()}
          actions={
            <CreateStackActions
              formState={formState}
              setFormState={setFormState}
              currentStepIndex={currentStepIndex}
              initialFormValid={initialFormValid}
              repoFormValid={repoFormValid}
              close={close}
              submit={mutation}
              loading={loading}
            />
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
              steps={stepperSteps}
              stepIndex={currentStepIndex}
            />
          </div>

          {formState === FormState.Initial && (
            <CreateStackBasic
              name={name}
              setName={setName}
              type={type}
              setType={setType}
              image={image}
              setImage={setImage}
              version={version}
              setVersion={setVersion}
              clusterId={clusterId}
              setClusterId={setClusterId}
              approval={approval}
              setApproval={setApproval}
            />
          )}

          {formState === FormState.Repository && (
            <CreateStackRepository
              repos={repos}
              repositoryId={repositoryId}
              setRepositoryId={setRepositoryId}
              gitRef={ref}
              setGitRef={setRef}
              gitFolder={folder}
              setGitFolder={setFolder}
            />
          )}

          {formState === FormState.Environment && (
            <CreateStackEnvironment
              environment={environment}
              setEnvironment={setEnvironment}
            />
          )}

          <div css={{ marginTop: theme.spacing.medium }}>
            {error && (
              <GqlError
                header="Something went wrong"
                error={error}
              />
            )}
          </div>
        </ModalAlt>
      </ModalMountTransition>
    </>
  )
}
