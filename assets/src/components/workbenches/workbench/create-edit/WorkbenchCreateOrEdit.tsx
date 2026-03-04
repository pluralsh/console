import {
  Button,
  Card,
  CheckOutlineIcon,
  CircleDashIcon,
  ErrorOutlineIcon,
  Flex,
} from '@pluralsh/design-system'
import {
  PolicyBindingFragment,
  useCreateWorkbenchMutation,
  useUpdateWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchAttributes,
  WorkbenchFragment,
} from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import {
  workbenchFormSteps,
  WorkbenchStepLabel,
  WORKBENCH_STEP_LABELS,
} from './WorkbenchFormSteps'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { cloneDeep } from 'lodash'
import { isNonNullable } from 'utils/isNonNullable'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { deepOmitFalsy } from 'utils/graphql'

// providing id sets mode to edit
type WorkbenchWizardMode = 'create' | { id: string }

// requires every key from WorkbenchAttributes to be present. readBindings/writeBindings
// use FormBinding[] so BindingInput can show chips (user email / group name).
export type WorkbenchFormState = Omit<
  Required<WorkbenchAttributes>,
  'readBindings' | 'writeBindings' | 'projectId'
> & {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

export function WorkbenchCreateOrEdit({
  mode,
  ...props
}: {
  mode: WorkbenchWizardMode
  onCancel: () => void
  onCompleted: () => void
}) {
  const id = mode === 'create' ? undefined : mode.id
  const { data, loading, error } = useWorkbenchQuery({
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  })
  const workbench = data?.workbench

  if (error) return <GqlError error={error} />

  return (
    <WorkbenchForm
      workbenchId={id}
      key={`${data?.workbench?.id}`} // reset form state if data comes in
      initialFormState={sanitizeInitialForm(workbench ?? { id: '', name: '' })}
      loading={!data && loading}
      {...props}
    />
  )
}

function WorkbenchForm({
  workbenchId,
  initialFormState,
  loading,
  onCancel,
  onCompleted,
}: {
  workbenchId: Nullable<string>
  initialFormState: WorkbenchFormState
  loading: boolean
  onCancel: () => void
  onCompleted: () => void
}) {
  const isCreateMode = !workbenchId
  const [formState, setFormState] =
    useState<WorkbenchFormState>(initialFormState)
  const [curStep, setCurStepState] =
    useState<WorkbenchStepLabel>('Workbench setup')
  const [stepStatuses, setStepStatuses] = useState<
    Record<WorkbenchStepLabel, StepStatus>
  >(INITIAL_STEP_STATUSES)

  const setCurStep = (newStep: WorkbenchStepLabel) => {
    setCurStepState(newStep)
    setStepStatuses((prev) => ({
      ...prev,
      [curStep]: validateStep(curStep, formState) ? 'visited' : 'error',
    }))
  }
  const curStepIndex = workbenchFormSteps.findIndex(
    ({ label }) => label === curStep
  )
  const allowSubmit = validateForm(formState)
  const numUnvisitedSteps = Object.values(stepStatuses).reduce(
    (acc, status) => acc + (status === 'not-visited' ? 1 : 0),
    0
  )

  const StepComponent = workbenchFormSteps[curStepIndex]?.component

  const [createWorkbench, { loading: createLoading, error: createError }] =
    useCreateWorkbenchMutation({
      onCompleted,
      refetchQueries: ['Workbenches'],
      awaitRefetchQueries: true,
    })

  const [_updateWorkbench, { loading: _updateLoading, error: updateError }] =
    useUpdateWorkbenchMutation()
  // const mutationLoading = createLoading || updateLoading
  const mutationError = createError || updateError

  return (
    <Flex
      gap="medium"
      height="100%"
      width={968}
      minHeight={0}
    >
      <Flex
        direction="column"
        width={200}
      >
        {workbenchFormSteps.map(({ label }) => (
          <SidebarItem
            key={label}
            label={label}
            active={curStep === label}
            status={isCreateMode ? stepStatuses[label] : null}
            onClick={() => setCurStep(label)}
          />
        ))}
      </Flex>
      {loading ? (
        <RectangleSkeleton
          $width="100%"
          $height="100%"
        />
      ) : (
        StepComponent && (
          <FormCardSC>
            {mutationError && <GqlError error={mutationError} />}
            <Flex
              grow={1}
              direction="column"
              gap="medium"
              overflow="auto"
            >
              <StepComponent
                formState={formState}
                setFormState={setFormState}
              />
            </Flex>
            <StretchedFlex shrink={0}>
              <Button
                destructive
                onClick={onCancel}
              >
                Cancel
              </Button>
              {numUnvisitedSteps < 2 ? (
                <Button
                  disabled={!allowSubmit}
                  loading={createLoading}
                  onClick={() =>
                    createWorkbench({
                      variables: {
                        attributes: formStateToAttributes(formState),
                      },
                    })
                  }
                >
                  Create workbench
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (!!workbenchFormSteps[curStepIndex + 1])
                      setCurStep(workbenchFormSteps[curStepIndex + 1].label)
                  }}
                >
                  Next
                </Button>
              )}
            </StretchedFlex>
          </FormCardSC>
        )
      )}
    </Flex>
  )
}

function SidebarItem({
  label,
  active,
  status,
  onClick,
}: {
  label: WorkbenchStepLabel
  active: boolean
  status: Nullable<StepStatus>
  onClick: () => void
}) {
  return (
    <SidebarBtnSC
      tertiary
      onClick={onClick}
      $active={active}
      endIcon={
        status === null ? null : status === 'visited' ? (
          <CheckOutlineIcon
            color="icon-success"
            size={10}
          />
        ) : status === 'error' ? (
          <ErrorOutlineIcon
            color="icon-danger"
            size={10}
          />
        ) : (
          <CircleDashIcon
            color="icon-light"
            size={10}
          />
        )
      }
    >
      {label}
    </SidebarBtnSC>
  )
}

const SidebarBtnSC = styled(Button)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.text.caption,
    justifyContent: 'space-between',
    color: theme.colors.text,
    padding: theme.spacing.xsmall,
    ...($active && {
      background: theme.colors['fill-one-selected'],
      pointerEvents: 'none',
    }),
  })
)

const FormCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
}))

type StepStatus = 'not-visited' | 'visited' | 'error'
const INITIAL_STEP_STATUSES = Object.fromEntries(
  workbenchFormSteps.map(({ label }) => [label, 'not-visited'])
) as Record<WorkbenchStepLabel, StepStatus>

const validateStep = (
  step: WorkbenchStepLabel,
  formState: WorkbenchFormState
) => {
  if (step === 'Workbench setup' && !formState.name) return false
  return true
}

const validateForm = (formState: WorkbenchFormState) =>
  WORKBENCH_STEP_LABELS.every((label) =>
    validateStep(label as WorkbenchStepLabel, formState)
  )

function formStateToAttributes(state: WorkbenchFormState): WorkbenchAttributes {
  const { readBindings, writeBindings, ...rest } = cloneDeep(
    deepOmitFalsy(state)
  )
  return {
    ...rest,
    readBindings: readBindings.map(bindingToBindingAttributes),
    writeBindings: writeBindings.map(bindingToBindingAttributes),
  }
}

// maps a WorkbenchFragment to form state
// if WorkbenchAttributes gains a new field, this will fail to compile until the mapping is added here
// (and the corresponding field is added to the Workbench GraphQL fragment)
function sanitizeInitialForm({
  name,
  description = '',
  systemPrompt = '',
  configuration,
  agentRuntime,
  repository,
  skills,
  tools,
  readBindings,
  writeBindings,
}: WorkbenchFragment): WorkbenchFormState {
  const { infrastructure, coding } = configuration ?? {}
  const { kubernetes, services, stacks } = infrastructure ?? {}
  const { mode, repositories } = coding ?? {}
  const { files, ref } = skills ?? {}

  return {
    name,
    description,
    systemPrompt,
    agentRuntimeId: agentRuntime?.id ?? null,
    repositoryId: repository?.id ?? null,
    configuration: {
      infrastructure: { kubernetes, services, stacks },
      coding: { mode, repositories },
    },
    skills: { ref, files },
    toolAssociations:
      tools?.flatMap((t) => (t ? [{ toolId: t.id }] : [])) ?? [],
    readBindings:
      readBindings?.filter(isNonNullable).flatMap(({ id, user, group }) => [
        {
          id,
          user: user && { id: user.id, name: user.name, email: user.email },
          group: group && { id: group.id, name: group.name },
        },
      ]) ?? [],
    writeBindings:
      writeBindings?.filter(isNonNullable).flatMap(({ id, user, group }) => [
        {
          id,
          user: user && { id: user.id, name: user.name, email: user.email },
          group: group && { id: group.id, name: group.name },
        },
      ]) ?? [],
  }
}
