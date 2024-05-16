import {
  FileIcon,
  GearTrainIcon,
  GitHubIcon,
  Stepper,
  TerminalIcon,
} from '@pluralsh/design-system'
import { useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { GqlError } from '../../utils/Alert'
import {
  StackEnvironmentAttributes,
  StackFileAttributes,
  StackType,
  StacksDocument,
  useCreateStackMutation,
  useGitRepositoriesQuery,
} from '../../../generated/graphql'
import {
  appendConnection,
  mapExistingNodes,
  updateCache,
} from '../../../utils/graphql'
import ModalAlt from '../../cd/ModalAlt'

import { CreateStackModalFormBasic } from './CreateStackModalFormBasic'
import { CreateStackModalFormRepository } from './CreateStackModalFormRepository'
import CreateStackModalActions from './CreateStackModalActions'
import { CreateStackModalFormEnvironment } from './CreateStackModalFormEnvironment'
import { CreateStackModalFormFiles } from './CreateStackModalFormFiles'

export enum FormState {
  Initial = 'initial',
  Repository = 'repository',
  Environment = 'environment',
  Files = 'files',
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
  {
    key: FormState.Files,
    stepTitle: <StepTitle>Files</StepTitle>,
    IconComponent: FileIcon,
    ...stepBase,
  },
]

export type StackFileAttributesExtended = StackFileAttributes & {
  name?: string
}

export default function CreateStackModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [formState, setFormState] = useState<FormState>(FormState.Files)
  const [name, setName] = useState('')
  const [type, setType] = useState<StackType>(StackType.Terraform)
  const [image, setImage] = useState('')
  const [version, setVersion] = useState('')
  const [clusterId, setClusterId] = useState('')
  const [approval, setApproval] = useState<boolean>(false)
  const [repositoryId, setRepositoryId] = useState('')
  const [ref, setRef] = useState('')
  const [folder, setFolder] = useState('')
  const [environment, setEnvironment] = useState<StackEnvironmentAttributes[]>([
    { name: '', value: '' },
  ])
  const [files, setFiles] = useState<StackFileAttributesExtended[]>([
    { path: '', content: '' },
  ])
  const [environmentErrors, setEnvironmentErrors] = useState(false)
  const [filesErrors, setFilesErrors] = useState(false)

  const initialFormValid = !!(name && type && version && clusterId)
  const repoFormValid = !!(repositoryId && ref && folder)
  const environmentFormValid = !environmentErrors
  const filesFormValid = !filesErrors

  const currentStepIndex = stepperSteps.findIndex(
    (step) => step.key === formState
  )

  const { data } = useGitRepositoriesQuery()
  const repos = mapExistingNodes(data?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  const [mutation, { loading, error }] = useCreateStackMutation({
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
        files,
        // TODO: Add job spec.
      },
    },
    onCompleted: () => onClose(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: StacksDocument,
        update: (prev) =>
          appendConnection(prev, data?.createStack, 'infrastructureStacks'),
      }),
  })

  return (
    <ModalAlt
      header="Create infrastracture stack"
      portal
      asForm
      open={open}
      onClose={onClose}
      actions={
        <CreateStackModalActions
          formState={formState}
          setFormState={setFormState}
          currentStepIndex={currentStepIndex}
          initialFormValid={initialFormValid}
          repoFormValid={repoFormValid}
          environmentFormValid={environmentFormValid}
          filesFormValid={filesFormValid}
          close={onClose}
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
        <CreateStackModalFormBasic
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
        <CreateStackModalFormRepository
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
        <CreateStackModalFormEnvironment
          environment={environment}
          setEnvironment={setEnvironment}
          setEnvironmentErrors={setEnvironmentErrors}
        />
      )}

      {formState === FormState.Files && (
        <CreateStackModalFormFiles
          files={files}
          setFiles={setFiles}
          setFilesErrors={setFilesErrors}
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
  )
}
