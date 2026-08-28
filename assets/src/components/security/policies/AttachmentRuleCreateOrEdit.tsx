import {
  Button,
  Card,
  Chip,
  EmptyState,
  Flex,
  FormField,
  Input2,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  ReturnIcon,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { StackedText } from 'components/utils/table/StackedText'
import {
  Body2BoldP,
  Body2P,
  StrongSC,
  Subtitle2H1,
} from 'components/utils/typography/Text'
import {
  BindingPolicyAttributes,
  BindingPolicyFragment,
  BindingPolicyType,
  BindingPolicyUpdateAttributes,
  PolicyTinyFragment,
  PolicyType,
  useBindingPolicyQuery,
  useCreateBindingPolicyMutation,
  useDeleteBindingPolicyMutation,
  usePoliciesQuery,
  useUpdateBindingPolicyMutation,
} from 'generated/graphql'
import { isEqual, startCase, truncate } from 'lodash'
import pluralize from 'pluralize'
import { KeyboardEvent, ReactNode, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ATTACHMENT_RULES_PARAM_ID,
  POLICIES_ATTACHMENT_RULES_ABS_PATH,
  POLICIES_ATTACHMENT_RULES_CREATE_ABS_PATH,
  POLICIES_ATTACHMENT_RULES_REL_PATH,
  getAttachmentRuleEditAbsPath,
} from 'routes/securityRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { ATTACHMENT_RULES_DESCRIPTION } from './AttachmentRules'
import { CreateBindingModal } from './CreateBindingModal'
import { getPoliciesBreadcrumbs } from './policiesBreadcrumbs'

const DEFAULT_INTERVAL = '1h'

type AttachmentRuleFormState = {
  policyId: string
  bindPolicyId: string
  type: BindingPolicyType | ''
  regexes: string[]
}

export function AttachmentRuleCreateOrEdit({
  mode,
}: {
  mode: 'create' | 'edit'
}) {
  const navigate = useNavigate()
  const id = useParams()[ATTACHMENT_RULES_PARAM_ID]
  const { data, loading, error } = useBindingPolicyQuery({
    variables: { id: id ?? '' },
    skip: mode === 'create' || !id,
    fetchPolicy: 'network-only',
  })
  const rule = data?.bindingPolicy

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getPoliciesBreadcrumbs(POLICIES_ATTACHMENT_RULES_REL_PATH),
        {
          label:
            mode === 'create' ? 'create' : (rule?.policy?.name ?? id ?? 'edit'),
          url:
            mode === 'create'
              ? POLICIES_ATTACHMENT_RULES_CREATE_ABS_PATH
              : getAttachmentRuleEditAbsPath(id ?? ''),
        },
      ],
      [id, mode, rule?.policy?.name]
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

  if (mode === 'edit' && !loading && !rule) {
    return (
      <EmptyState message="Attachment rule not found">
        <Button
          as={Link}
          to={POLICIES_ATTACHMENT_RULES_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          Back to all attachments
        </Button>
      </EmptyState>
    )
  }

  if (mode === 'edit' && loading && !rule) {
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
    <AttachmentRuleForm
      key={rule?.id ?? 'create'}
      mode={mode}
      rule={rule ?? undefined}
      onCompleted={() => navigate(POLICIES_ATTACHMENT_RULES_ABS_PATH)}
    />
  )
}

function AttachmentRuleForm({
  mode,
  rule,
  onCompleted,
}: {
  mode: 'create' | 'edit'
  rule?: BindingPolicyFragment
  onCompleted: () => void
}) {
  const { popToast } = useSimpleToast()
  const isCreate = mode === 'create'
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bindingModalOpen, setBindingModalOpen] = useState(false)
  const [bindSelectOpen, setBindSelectOpen] = useState(false)
  const [regexDraft, setRegexDraft] = useState('')
  const [form, setForm] = useState<AttachmentRuleFormState>(() =>
    sanitizeForm(rule)
  )
  const [initialForm] = useState(() => sanitizeForm(rule))
  const [selectedAttachPolicy, setSelectedAttachPolicy] = useState<
    PolicyTinyFragment | undefined
  >(rule?.policy ?? undefined)
  const [selectedBindPolicy, setSelectedBindPolicy] = useState<
    PolicyTinyFragment | undefined
  >(rule?.bindPolicy ?? undefined)
  const showToolMatches = form.type === BindingPolicyType.Workbench

  const [createBindingPolicy, { loading: createLoading, error: createError }] =
    useCreateBindingPolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Attachment rule created', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['BindingPolicies'],
      awaitRefetchQueries: true,
    })
  const [updateBindingPolicy, { loading: updateLoading, error: updateError }] =
    useUpdateBindingPolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Attachment rule saved', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['BindingPolicies', 'BindingPolicy'],
      awaitRefetchQueries: true,
    })
  const [deleteBindingPolicy, { loading: deleteLoading, error: deleteError }] =
    useDeleteBindingPolicyMutation({
      onCompleted: () => {
        popToast({ content: 'Attachment rule deleted', severity: 'success' })
        onCompleted()
      },
      refetchQueries: ['BindingPolicies'],
      awaitRefetchQueries: true,
    })

  const mutationError = createError || updateError
  const mutationLoading = createLoading || updateLoading
  const canSave =
    !!form.policyId &&
    !!form.bindPolicyId &&
    !!form.type &&
    !isEqual(form, initialForm)

  const addRegex = () => {
    const value = regexDraft.trim()

    if (!value || form.regexes.includes(value)) {
      setRegexDraft('')
      return
    }

    setForm((prev) => ({ ...prev, regexes: [...prev.regexes, value] }))
    setRegexDraft('')
  }

  const onRegexKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    addRegex()
  }

  const onSave = () => {
    if (!canSave || !form.type) return

    if (isCreate) {
      createBindingPolicy({
        variables: { attributes: formToCreateAttributes(form) },
      })
      return
    }
    updateBindingPolicy({
      variables: {
        id: rule?.id ?? '',
        attributes: formToUpdateAttributes(form),
      },
    })
  }

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Subtitle2H1 css={{ fontWeight: 400 }}>
          {isCreate ? 'Create a new attachment' : 'Edit attachment'}
        </Subtitle2H1>
        <Body2P $color="text-xlight">{ATTACHMENT_RULES_DESCRIPTION}</Body2P>
      </Flex>
      {mutationError && <GqlError error={mutationError} />}
      <FormCardSC>
        <FormRowSC>
          <FormLabelSC>
            <Body2BoldP>Select a policy to attach</Body2BoldP>
          </FormLabelSC>
          <PolicySelect
            allowedTypes={[PolicyType.Workbench, PolicyType.Stack]}
            selectedPolicy={selectedAttachPolicy}
            selectedKey={form.policyId}
            placeholder="Select a policy"
            showTypeChip
            onSelectionChange={(policy) => {
              setSelectedAttachPolicy(policy)
              setForm((prev) => ({
                ...prev,
                policyId: policy.id,
                type: policyTypeToBindingType(policy.type),
              }))
            }}
          />
        </FormRowSC>
        <FormRowSC>
          <FormLabelSC>
            <Body2BoldP>Choose targets to bind policy</Body2BoldP>
            <NewBindingLinkSC
              type="button"
              onClick={() => setBindingModalOpen(true)}
            >
              New binding
            </NewBindingLinkSC>
          </FormLabelSC>
          <PolicySelect
            allowedTypes={[PolicyType.Binding]}
            selectedPolicy={selectedBindPolicy}
            selectedKey={form.bindPolicyId}
            placeholder="Select a bind policy"
            showMatchChip
            isOpen={bindSelectOpen}
            onOpenChange={setBindSelectOpen}
            dropdownFooterFixed={
              <ListBoxFooterPlus
                onClick={() => {
                  setBindSelectOpen(false)
                  setBindingModalOpen(true)
                }}
              >
                New binding
              </ListBoxFooterPlus>
            }
            onSelectionChange={(policy) => {
              setSelectedBindPolicy(policy)
              setForm((prev) => ({ ...prev, bindPolicyId: policy.id }))
            }}
          />
        </FormRowSC>
      </FormCardSC>
      {showToolMatches && (
        <FormCardSC>
          <FormField label="Match tool names">
            <Flex
              direction="column"
              gap="xsmall"
            >
              <Input2
                value={regexDraft}
                placeholder="Add regex and press enter"
                onChange={(e) => setRegexDraft(e.target.value)}
                onKeyDown={onRegexKeyDown}
              />
              {form.regexes.length > 0 && (
                <Flex
                  flexWrap="wrap"
                  gap="xsmall"
                >
                  {form.regexes.map((regex) => (
                    <Chip
                      key={regex}
                      size="small"
                      clickable
                      closeButton
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          regexes: prev.regexes.filter(
                            (item) => item !== regex
                          ),
                        }))
                      }
                    >
                      {regex}
                    </Chip>
                  ))}
                </Flex>
              )}
            </Flex>
          </FormField>
        </FormCardSC>
      )}
      <ActionsFooterSC>
        {isCreate ? (
          <div />
        ) : (
          <Button
            destructive
            onClick={() => setDeleteOpen(true)}
          >
            Delete attachment rule
          </Button>
        )}
        <Flex gap="xsmall">
          <Button
            floating
            as={Link}
            to={POLICIES_ATTACHMENT_RULES_ABS_PATH}
            startIcon={<ReturnIcon />}
          >
            Back to all attachments
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
      <CreateBindingModal
        open={bindingModalOpen}
        onClose={() => setBindingModalOpen(false)}
        onCreated={(created) => {
          setSelectedBindPolicy(created)
          setForm((prev) => ({ ...prev, bindPolicyId: created.id }))
          setBindingModalOpen(false)
        }}
      />
      <Confirm
        open={deleteOpen}
        close={() => setDeleteOpen(false)}
        destructive
        title="Delete attachment rule"
        label="Delete attachment rule"
        loading={deleteLoading}
        error={deleteError}
        submit={() =>
          deleteBindingPolicy({ variables: { id: rule?.id ?? '' } })
        }
        text={
          <span>
            Are you sure you want to delete{' '}
            <StrongSC $color="text-danger">
              {truncate(rule?.policy?.name ?? 'attachment rule', {
                length: 40,
              })}
            </StrongSC>
            ?
          </span>
        }
      />
    </WrapperSC>
  )
}

function PolicySelect({
  allowedTypes,
  selectedPolicy,
  selectedKey,
  placeholder,
  showTypeChip = false,
  showMatchChip = false,
  dropdownFooterFixed,
  isOpen,
  onOpenChange,
  onSelectionChange,
}: {
  allowedTypes: PolicyType[]
  selectedPolicy?: PolicyTinyFragment
  selectedKey: string
  placeholder: string
  showTypeChip?: boolean
  showMatchChip?: boolean
  dropdownFooterFixed?: ReactNode
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onSelectionChange: (policy: PolicyTinyFragment) => void
}) {
  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData({
    queryHook: usePoliciesQuery,
    keyPath: ['policies'],
  })
  const policies = useMemo(() => {
    const loaded = mapExistingNodes(data?.policies).filter((policy) =>
      allowedTypes.includes(policy.type)
    )

    return withSelectedPolicy(loaded, selectedPolicy)
  }, [allowedTypes, data?.policies, selectedPolicy])

  return (
    <SelectWrapSC>
      <Select
        selectedKey={selectedKey || null}
        label={placeholder}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        rightContent={policyChip(selectedPolicy, showTypeChip, showMatchChip)}
        dropdownFooter={
          !data && loading ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : pageInfo?.hasNextPage ? (
            <ListBoxFooterPlus>Load more</ListBoxFooterPlus>
          ) : undefined
        }
        onFooterClick={() => {
          if (pageInfo?.hasNextPage) fetchNextPage()
        }}
        dropdownFooterFixed={dropdownFooterFixed}
        onSelectionChange={(key) => {
          const policy = policies.find((item) => item.id === `${key}`)

          if (!policy) return
          onSelectionChange(policy)
        }}
      >
        {policies.length === 0 ? (
          <ListBoxItem
            key="empty"
            label={loading ? 'Loading policies' : 'No policies found'}
            disabled
            textValue=""
          />
        ) : (
          policies.map((policy) => (
            <ListBoxItem
              key={policy.id}
              textValue={policy.name}
              label={
                <StackedText
                  truncate
                  first={policy.name}
                  second={policy.description}
                  firstColor="text"
                />
              }
              rightContent={policyChip(policy, showTypeChip, showMatchChip)}
            />
          ))
        )}
      </Select>
    </SelectWrapSC>
  )
}

function withSelectedPolicy(
  policies: PolicyTinyFragment[],
  selected?: PolicyTinyFragment
) {
  if (!selected?.id) return policies
  if (policies.some((policy) => policy.id === selected.id)) return policies

  return [selected, ...policies]
}

function policyChip(
  policy: Nullable<PolicyTinyFragment>,
  showTypeChip: boolean,
  showMatchChip: boolean
) {
  if (showMatchChip && policy)
    return <MatchesChip count={policy.matchCount ?? 0} />
  if (showTypeChip && policy?.type) return <TypeChip type={policy.type} />

  return undefined
}

function MatchesChip({ count }: { count: number }) {
  const theme = useTheme()

  return (
    <Chip
      size="small"
      fillLevel={1}
      css={{
        borderRadius: 20,
        minWidth: 80,
        justifyContent: 'center',
      }}
    >
      <span css={{ color: theme.colors['text-xlight'] }}>
        {count} {pluralize('match', count)}
      </span>
    </Chip>
  )
}

function TypeChip({ type }: { type: PolicyType }) {
  const theme = useTheme()

  return (
    <Chip
      size="small"
      fillLevel={1}
      css={{
        borderRadius: 20,
        minWidth: 80,
        justifyContent: 'center',
      }}
    >
      <span css={{ color: theme.colors['text-xlight'] }}>
        {startCase(type.toLowerCase())}
      </span>
    </Chip>
  )
}

function sanitizeForm(
  rule: Nullable<BindingPolicyFragment>
): AttachmentRuleFormState {
  return {
    policyId: rule?.policy?.id ?? '',
    bindPolicyId: rule?.bindPolicy?.id ?? '',
    type: rule?.type ?? '',
    regexes: (rule?.matches?.workbench?.regexes ?? []).filter(
      (regex): regex is string => !!regex
    ),
  }
}

function formToCreateAttributes(
  form: AttachmentRuleFormState
): BindingPolicyAttributes {
  return {
    policyId: form.policyId,
    bindPolicyId: form.bindPolicyId,
    type: form.type as BindingPolicyType,
    interval: DEFAULT_INTERVAL,
    ...(form.type === BindingPolicyType.Workbench
      ? { matches: { workbench: { regexes: form.regexes } } }
      : {}),
  }
}

function formToUpdateAttributes(
  form: AttachmentRuleFormState
): BindingPolicyUpdateAttributes {
  return {
    policyId: form.policyId,
    bindPolicyId: form.bindPolicyId,
    type: form.type as BindingPolicyType,
    matches: {
      workbench: {
        regexes: form.type === BindingPolicyType.Workbench ? form.regexes : [],
      },
    },
  }
}

function policyTypeToBindingType(
  type: Nullable<PolicyType>
): BindingPolicyType | '' {
  if (type === PolicyType.Stack) return BindingPolicyType.Stack
  if (type === PolicyType.Workbench) return BindingPolicyType.Workbench

  return ''
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

const FormRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.xsmall,
  width: '100%',
}))

const FormLabelSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  width: 300,
  flexShrink: 0,
  paddingTop: theme.spacing.small,
}))

const SelectWrapSC = styled.div({
  flex: 1,
  minWidth: 0,
  width: '100%',
  '& .selectInner': { width: '100%' },
})

const NewBindingLinkSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  color: theme.colors['text-primary-accent'],
  textDecoration: 'underline',
  width: 'fit-content',
  cursor: 'pointer',
}))

const ActionsFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.medium,
  width: '100%',
}))
