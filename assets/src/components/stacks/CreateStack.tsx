import {
  Button,
  GearTrainIcon,
  GitHubIcon,
  Stepper,
  Tooltip,
} from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { ReactNode, useCallback, useState } from 'react'
import isEmpty from 'lodash/isEmpty'

import styled, { useTheme } from 'styled-components'

import { GqlError } from '../utils/Alert'
import {
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

import { CreateStackBasic } from './CreateStackBasic'
import { CreateStackRepository } from './CreateStackRepository'

enum FormState {
  Initial = 'initial',
  Repository = 'repository',
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
      <ModalAlt
        header="Create infrastracture stack"
        portal
        asForm
        open={open}
        onClose={() => close()}
        actions={
          <>
            <Button
              secondary
              onClick={() => close()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEmpty(name)}
              onClick={() => mutation()}
              loading={loading}
              marginLeft="medium"
            >
              Create
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

        <div css={{ marginTop: theme.spacing.medium }}>
          {error && (
            <GqlError
              header="Something went wrong"
              error={error}
            />
          )}
        </div>
      </ModalAlt>
    </>
  )
}
