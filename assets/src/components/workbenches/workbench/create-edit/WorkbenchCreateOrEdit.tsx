import {
  Button,
  Card,
  CheckOutlineIcon,
  CircleDashIcon,
  ErrorOutlineIcon,
  Flex,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { Title2H1 } from 'components/utils/typography/Text'
import { getWorkbenchesBreadcrumbs } from 'components/workbenches/Workbenches'
import {
  PolicyBindingFragment,
  useCreateWorkbenchMutation,
  useUpdateWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchAttributes,
  WorkbenchFragment,
} from 'generated/graphql'
import { cloneDeep } from 'lodash'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { deepOmitFalsy } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  WORKBENCH_STEP_LABELS,
  workbenchFormSteps,
  WorkbenchStepLabel,
} from './WorkbenchFormSteps'

// requires every key from WorkbenchAttributes to be present. readBindings/writeBindings
// use FormBinding[] so BindingInput can show chips (user email / group name).
export type WorkbenchFormState = Omit<
  Required<WorkbenchAttributes>,
  'readBindings' | 'writeBindings' | 'projectId'
> & {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

export function WorkbenchCreateOrEdit({ mode }: { mode: 'create' | 'edit' }) {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const { data, loading, error } = useWorkbenchQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })
  const workbench = data?.workbench

  useSetBreadcrumbs(
    useMemo(
      () =>
        workbench
          ? [...getWorkbenchBreadcrumbs(workbench), { label: 'edit' }]
          : getWorkbenchesBreadcrumbs(mode === 'create' ? 'create' : undefined),
      [workbench, mode]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      padding="large"
    >
      {mode === 'create' ? (
        <Title2H1>Create a workbench</Title2H1>
      ) : (
        <StackedText
          loading={!data && loading}
          first={workbench?.name}
          second={workbench?.description}
        />
      )}
      <WorkbenchForm
        workbenchId={id}
        key={`${JSON.stringify(data?.workbench)}`} // reset form state if data updates
        initialFormState={sanitizeInitialForm(
          workbench ?? { id: '', name: '' }
        )}
        loading={!data && loading}
      />
    </Flex>
  )
}

function WorkbenchForm({
  workbenchId,
  initialFormState,
  loading,
}: {
  workbenchId: Nullable<string>
  initialFormState: WorkbenchFormState
  loading: boolean
}) {
  const navigate = useNavigate()
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
      onCompleted: () => {
        navigate(
          workbenchId ? getWorkbenchAbsPath(workbenchId) : WORKBENCHES_ABS_PATH
        )
      },
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
            <StepComponent
              formState={formState}
              setFormState={setFormState}
            />
            <StickyActionsFooterSC>
              <Button
                destructive
                as={Link}
                to={
                  workbenchId
                    ? getWorkbenchAbsPath(workbenchId)
                    : WORKBENCHES_ABS_PATH
                }
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
            </StickyActionsFooterSC>
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

export const FormCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.xlarge,
  paddingBottom: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  overflow: 'auto',
  height: '100%',
}))

export const StickyActionsFooterSC = styled.div(({ theme }) => ({
  position: 'sticky',
  display: 'flex',
  justifyContent: 'space-between',
  bottom: 0,
  marginTop: 'auto',
  zIndex: theme.zIndexes.tooltip,
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors['fill-one']}`, // should match bg color
  padding: `${theme.spacing.small}px 0 ${theme.spacing.xlarge}px`,
  '&::before': { flex: 1 },
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
  const {
    name,
    readBindings: r,
    writeBindings: w,
    ...rest
  } = cloneDeep(deepOmitFalsy(state))

  return {
    name: name ?? '',
    ...(r && { readBindings: r.map(bindingToBindingAttributes) }),
    ...(w && { writeBindings: w.map(bindingToBindingAttributes) }),
    ...rest,
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
