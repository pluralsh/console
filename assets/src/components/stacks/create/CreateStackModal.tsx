import {
  CraneIcon,
  FileIcon,
  GearTrainIcon,
  GitHubIcon,
  Stepper,
  TerminalIcon,
} from '@pluralsh/design-system'
import { useCallback, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import { useNavigate } from 'react-router-dom'

import { GqlError } from '../../utils/Alert'
import {
  StackEnvironmentAttributes,
  StackFileAttributes,
  StackType,
  useCreateStackMutation,
  useGitRepositoriesQuery,
} from '../../../generated/graphql'
import { mapExistingNodes } from '../../../utils/graphql'
import ModalAlt from '../../cd/ModalAlt'

import { getStacksAbsPath } from '../../../routes/stacksRoutesConsts'

import { CreateStackModalFormBasic } from './CreateStackModalFormBasic'
import { CreateStackModalFormRepository } from './CreateStackModalFormRepository'
import CreateStackModalActions from './CreateStackModalActions'
import { CreateStackModalFormEnvironment } from './CreateStackModalFormEnvironment'
import { CreateStackModalFormFiles } from './CreateStackModalFormFiles'
import { CreateStackModalFormJob } from './CreateStackModalFormJob'

export enum FormState {
  Initial = 'initial',
  Repository = 'repository',
  Environment = 'environment',
  Files = 'files',
  Job = 'job',
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
    stepTitle: <StepTitle>General</StepTitle>,
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
  {
    key: FormState.Job,
    stepTitle: <StepTitle>Job</StepTitle>,
    IconComponent: CraneIcon,
    ...stepBase,
  },
]

export type StackFileAttributesExtended = StackFileAttributes & {
  name?: string
}

export default function CreateStackModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch?: Nullable<() => void>
}) {
  const theme = useTheme()
  const navigate = useNavigate()
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
  const [files, setFiles] = useState<StackFileAttributesExtended[]>([])
  const [jobNamespace, setJobNamespace] = useState('')
  const [jobSpec, setJobSpec] = useState('')
  const [environmentErrors, setEnvironmentErrors] = useState(false)
  const [filesErrors, setFilesErrors] = useState(false)

  const initialFormValid = !!(name && type && version && clusterId)
  const repoFormValid = !!(repositoryId && ref && folder)
  const environmentFormValid = !environmentErrors
  const filesFormValid = !filesErrors
  const jobFormValid =
    (isEmpty(jobNamespace) && isEmpty(jobSpec)) ||
    (!isEmpty(jobSpec) && !isEmpty(jobNamespace))

  const currentStepIndex = stepperSteps.findIndex(
    (step) => step.key === formState
  )

  const { data } = useGitRepositoriesQuery()
  const repos = mapExistingNodes(data?.gitRepositories).filter(
    (repo) => repo.health === 'PULLABLE'
  )

  const [mutation, { loading, error }] = useCreateStackMutation({
    onCompleted: (data) => {
      refetch?.()
      onClose()
      navigate(getStacksAbsPath(data.createStack?.id))
    },
  })

  const createStack = useCallback(() => {
    const variables = {
      attributes: {
        name,
        type,
        clusterId,
        approval,
        configuration: { image, version },
        repositoryId,
        git: { ref, folder },
        environment,
        files: files.map(({ path, content }) => ({
          path,
          content,
        })),
        jobSpec: jobSpec
          ? { namespace: jobNamespace, raw: jobSpec }
          : undefined,
      },
    }

    mutation({ variables })
  }, [
    approval,
    clusterId,
    environment,
    files,
    folder,
    image,
    jobNamespace,
    jobSpec,
    mutation,
    name,
    ref,
    repositoryId,
    type,
    version,
  ])

  return (
    <ModalAlt
      header="Create infrastracture stack"
      portal
      width={640}
      maxWidth={640}
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
          jobFormValid={jobFormValid}
          close={onClose}
          submit={createStack}
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

      {formState === FormState.Job && (
        <CreateStackModalFormJob
          jobNamespace={jobNamespace}
          setJobNamespace={setJobNamespace}
          jobSpec={jobSpec}
          setJobSpec={setJobSpec}
        />
      )}

      {error && (
        <div css={{ marginTop: theme.spacing.medium }}>
          <GqlError
            header="Something went wrong"
            error={error}
          />
        </div>
      )}
    </ModalAlt>
  )
}
