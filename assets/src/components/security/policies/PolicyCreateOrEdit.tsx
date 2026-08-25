import {
  Button,
  Card,
  CodeEditor,
  EmptyState,
  Flex,
  FormField,
  Input,
  Input2,
  Radio,
  RadioGroup,
  ReturnIcon,
  ShieldLockIcon,
  StackIcon,
  WorkbenchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { ProjectSelect } from 'components/utils/ProjectSelector'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P, StrongSC, Subtitle2H1 } from 'components/utils/typography/Text'
import {
  PolicyAttributes,
  PolicyFragment,
  PolicyType,
  useCreatePolicyMutation,
  useDeletePolicyMutation,
  usePolicyQuery,
  useUpdatePolicyMutation,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { ReactNode, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  POLICIES_ABS_PATH,
  POLICIES_CREATE_ABS_PATH,
  POLICIES_PARAM_ID,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
  getPolicyEditAbsPath,
} from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { POLICIES_DESCRIPTION } from './Policies'

const DEFAULT_POLICY_SOURCE = `package workbench.tools

import rego.v1

default allow := false

# read-only tooling is always permitted
allow if {
        input.tool.name in {"read_file", "list_dir", "grep"}
}

# destructive kubectl needs the on-call group off production
allow if {
        startswith(input.tool.name, "kubectl_")
        input.actor.groups[_] == "sre-oncall"
        not input.cluster.production
}
`

const TYPE_OPTIONS: {
  value: PolicyType
  label: string
  description: string
  icon: ReactNode
}[] = [
  {
    value: PolicyType.Workbench,
    label: 'Workbenches',
    description: 'Admit or deny agent tool calls.',
    icon: <WorkbenchIcon size={16} />,
  },
  {
    value: PolicyType.Stack,
    label: 'Stacks',
    description: 'Admit or deny tool calls in stacks.',
    icon: <StackIcon size={16} />,
  },
  {
    value: PolicyType.Binding,
    label: 'Bindings',
    description:
      'Admit or deny attaching a policy to matching workbenches and stacks.',
    icon: <ShieldLockIcon size={16} />,
  },
]

type PolicyFormState = {
  name: string
  description: string
  projectId: string
  type: PolicyType
  policy: string
}

export function PolicyCreateOrEdit({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const id = useParams()[POLICIES_PARAM_ID]
  const defaultProjectId = useProjectId() ?? ''
  const { data, loading, error } = usePolicyQuery({
    variables: { id },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })
  const policy = data?.policy

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
        { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
        {
          label: mode === 'create' ? 'create' : (policy?.name ?? id ?? 'edit'),
          url:
            mode === 'create'
              ? POLICIES_CREATE_ABS_PATH
              : getPolicyEditAbsPath(id ?? ''),
        },
      ],
      [id, mode, policy?.name]
    )
  )

  if (error) {
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )
  }

  if (mode === 'edit' && !loading && !policy) {
    return (
      <EmptyState message="Policy not found">
        <Button
          as={Link}
          to={POLICIES_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          Back to all policies
        </Button>
      </EmptyState>
    )
  }

  if (mode === 'edit' && loading && !policy) {
    return (
      <Flex
        direction="column"
        height="100%"
      >
        <RectangleSkeleton
          $width="100%"
          $height="100%"
        />
      </Flex>
    )
  }

  return (
    <PolicyForm
      key={policy?.id ?? 'create'}
      mode={mode}
      policy={policy ?? undefined}
      defaultProjectId={defaultProjectId}
      onCompleted={() => navigate(POLICIES_ABS_PATH)}
    />
  )
}

function PolicyForm({
  mode,
  policy,
  defaultProjectId,
  onCompleted,
}: {
  mode: 'create' | 'edit'
  policy?: PolicyFragment
  defaultProjectId: string
  onCompleted: () => void
}) {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const isCreate = mode === 'create'
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState<PolicyFormState>(() =>
    sanitizeForm(policy, defaultProjectId)
  )

  const [createPolicy, { loading: createLoading, error: createError }] =
    useCreatePolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Policy created', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['Policies'],
      awaitRefetchQueries: true,
    })
  const [updatePolicy, { loading: updateLoading, error: updateError }] =
    useUpdatePolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Policy saved', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['Policies', 'Policy'],
      awaitRefetchQueries: true,
    })
  const [deletePolicy, { loading: deleteLoading, error: deleteError }] =
    useDeletePolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Policy deleted', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['Policies'],
      awaitRefetchQueries: true,
    })

  const mutationError = createError || updateError
  const mutationLoading = createLoading || updateLoading
  const canSave = !!form.name.trim() && !!form.policy.trim() && !!form.type

  const onSave = () => {
    const attributes = formToAttributes(form)

    if (isCreate) {
      createPolicy({ variables: { attributes } })
      return
    }
    updatePolicy({ variables: { id: policy?.id ?? '', attributes } })
  }

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Subtitle2H1 css={{ fontWeight: 400 }}>
          {isCreate ? 'Create a new policy' : 'Edit policy'}
        </Subtitle2H1>
        <Body2P $color="text-xlight">{POLICIES_DESCRIPTION}</Body2P>
      </Flex>
      {mutationError && <GqlError error={mutationError} />}
      <FormCardSC>
        <FieldsRowSC>
          <FormField
            label="Name"
            required
          >
            <Input2
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Project">
            <ProjectSelect
              selectedProject={form.projectId}
              setSelectedProject={(projectId) =>
                setForm((prev) => ({ ...prev, projectId }))
              }
              titleContent={null}
            />
          </FormField>
        </FieldsRowSC>
        <FormField label="Description">
          <Input
            multiline
            minRows={2}
            value={form.description}
            placeholder="Describe what this policy governs"
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </FormField>
        <FormField label="Enforcement rules">
          <RadioGroup
            value={form.type}
            orientation="horizontal"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, type: value as PolicyType }))
            }
            css={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.xsmall,
              width: '100%',
            }}
          >
            {TYPE_OPTIONS.map((option) => {
              const selected = form.type === option.value

              return (
                <TypeCardSC
                  key={option.value}
                  fillLevel={1}
                  $selected={selected}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, type: option.value }))
                  }
                >
                  <Radio
                    value={option.value}
                    small
                    css={{
                      alignItems: 'flex-start',
                      width: '100%',
                      padding: 0,
                      color: theme.colors.text,
                    }}
                  >
                    <Flex
                      direction="column"
                      gap="xxsmall"
                    >
                      <Flex
                        gap="xxsmall"
                        align="center"
                      >
                        {option.icon}
                        {option.label}
                      </Flex>
                      <Body2P $color="text-xlight">{option.description}</Body2P>
                    </Flex>
                  </Radio>
                </TypeCardSC>
              )
            })}
          </RadioGroup>
        </FormField>
      </FormCardSC>
      <FormCardSC>
        <FormField label="Policy">
          <CodeEditor
            value={form.policy}
            language="rego"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, policy: value ?? '' }))
            }
            height={320}
            options={{ minimap: { enabled: false }, wordWrap: 'on' }}
          />
        </FormField>
      </FormCardSC>
      <ActionsFooterSC>
        {isCreate ? (
          <div />
        ) : (
          <Button
            destructive
            onClick={() => setDeleteOpen(true)}
          >
            Delete policy
          </Button>
        )}
        <Flex gap="xsmall">
          <Button
            floating
            as={Link}
            to={POLICIES_ABS_PATH}
            startIcon={<ReturnIcon />}
          >
            Back to all policies
          </Button>
          <Button
            primary
            disabled={!canSave}
            loading={mutationLoading}
            onClick={onSave}
          >
            Save
          </Button>
        </Flex>
      </ActionsFooterSC>
      <Confirm
        open={deleteOpen}
        close={() => setDeleteOpen(false)}
        destructive
        title="Delete policy"
        label="Delete policy"
        loading={deleteLoading}
        error={deleteError}
        submit={() => deletePolicy({ variables: { id: policy?.id ?? '' } })}
        text={
          <span>
            Are you sure you want to delete{' '}
            <StrongSC $color="text-danger">
              {truncate(policy?.name ?? '', { length: 40 })}
            </StrongSC>
            ?
          </span>
        }
      />
    </WrapperSC>
  )
}

function sanitizeForm(
  policy: Nullable<PolicyFragment>,
  defaultProjectId: string
): PolicyFormState {
  return {
    name: policy?.name ?? '',
    description: policy?.description ?? '',
    projectId: policy?.project?.id ?? defaultProjectId,
    type: policy?.type ?? PolicyType.Workbench,
    policy: policy?.policy ?? DEFAULT_POLICY_SOURCE,
  }
}

function formToAttributes(form: PolicyFormState): PolicyAttributes {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    projectId: form.projectId || undefined,
    type: form.type,
    policy: form.policy,
  }
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: '100%',
  paddingBottom: theme.spacing.large,
}))

const FormCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.xlarge,
  width: '100%',
}))

const FieldsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  width: '100%',
  '& > *': { flex: 1, minWidth: 0 },
}))

const TypeCardSC = styled(Card)<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    flex: 1,
    minWidth: 180,
    padding: theme.spacing.small,
    cursor: 'pointer',
    backgroundColor: theme.colors['fill-one'],
    borderColor: $selected
      ? theme.colors['border-fill-three']
      : theme.colors['border-fill-two'],
  })
)

const ActionsFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.medium,
  width: '100%',
}))
