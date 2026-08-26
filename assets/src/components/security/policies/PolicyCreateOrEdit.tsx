import {
  Button,
  Card,
  CodeEditor,
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
import { ProjectSelect } from 'components/utils/ProjectSelector'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { Body2P, Subtitle2H1 } from 'components/utils/typography/Text'
import {
  PolicyAttributes,
  PolicyType,
  useCreatePolicyMutation,
} from 'generated/graphql'
import { isEqual } from 'lodash'
import { ReactNode, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { POLICIES_ABS_PATH } from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { POLICIES_DESCRIPTION, getPoliciesBreadcrumbs } from './Policies'

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

export function PolicyCreateOrEdit() {
  const navigate = useNavigate()
  const defaultProjectId = useProjectId() ?? ''

  useSetBreadcrumbs(useMemo(() => getPoliciesBreadcrumbs('create'), []))

  return (
    <PolicyForm
      defaultProjectId={defaultProjectId}
      onCompleted={() => navigate(POLICIES_ABS_PATH)}
    />
  )
}

function PolicyForm({
  defaultProjectId,
  onCompleted,
}: {
  defaultProjectId: string
  onCompleted: () => void
}) {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const [form, setForm] = useState<PolicyFormState>(() =>
    emptyForm(defaultProjectId)
  )
  const [initialForm] = useState(() => emptyForm(defaultProjectId))

  const [createPolicy, { loading, error }] = useCreatePolicyMutation({
    onCompleted: () => {
      popToast({ content: 'Policy created', severity: 'success' })
      onCompleted()
    },
    refetchQueries: ['Policies'],
    awaitRefetchQueries: true,
  })

  const canSave =
    !!form.name.trim() &&
    !!form.policy.trim() &&
    !!form.type &&
    !isEqual(form, initialForm)

  const onSave = () => {
    if (!canSave) return

    createPolicy({ variables: { attributes: formToAttributes(form) } })
  }

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Subtitle2H1 css={{ fontWeight: 400 }}>Create a new policy</Subtitle2H1>
        <Body2P $color="text-xlight">{POLICIES_DESCRIPTION}</Body2P>
      </Flex>
      {error && <GqlError error={error} />}
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
        <FormField
          label="Policy"
          required
        >
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
          loading={loading}
          onClick={onSave}
        >
          Save
        </Button>
      </ActionsFooterSC>
    </WrapperSC>
  )
}

function emptyForm(defaultProjectId: string): PolicyFormState {
  return {
    name: '',
    description: '',
    projectId: defaultProjectId,
    type: PolicyType.Workbench,
    policy: '',
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
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: theme.spacing.medium,
  width: '100%',
}))
