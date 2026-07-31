import {
  Card,
  CaretDownIcon,
  Chip,
  ChipList,
  DiscoverIcon,
  Flex,
  FormField,
  Input2,
  KubernetesIcon,
  ListIcon,
  ListBoxItem,
  Select,
  SelectButton,
  useFloatingDropdown,
} from '@pluralsh/design-system'
import type { Key } from '@react-types/shared'
import {
  Body2BoldP,
  Body2P,
  OverlineH3,
} from 'components/utils/typography/Text'
import type { WorkbenchJobModesAttributes } from 'generated/graphql'
import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useButton } from 'react-aria'
import { useTheme } from 'styled-components'
import { WorkbenchBudgetLimitControl } from './WorkbenchBudgetLimit'
import {
  WorkbenchCodingSupervisionFields,
  WorkbenchKubernetesMutationFields,
  WorkbenchVerificationLoopControl,
} from './WorkbenchModeOptionFields'
import { WorkbenchPromptPopover } from './WorkbenchPromptModeSelector'
import {
  attributesForPromptMode,
  CODING_AGENT_LABEL,
  disableKubernetesModes,
  enableKubernetesModes,
  KUBERNETES_ACTIONS_HINT,
  KUBERNETES_ACTIONS_LABEL,
  READ_MODE_LABEL,
  updateBudgetModes,
  updateCodingModes,
  WRITE_MODE_HINT,
  WRITE_MODE_LABEL,
} from './workbenchPromptModes'

export function WorkbenchModesForm({
  workbenchId,
  value,
  onChange,
  disabled = false,
}: {
  workbenchId?: Nullable<string>
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const selectedMode = value?.plan ? 'plan' : 'agent'
  const coding = value?.coding
  const kubernetes = value?.kubernetes
  const [openPanel, setOpenPanel] = useState<'coding' | 'kubernetes' | null>(
    null
  )

  const setMode = (mode: 'agent' | 'plan') =>
    onChange(attributesForPromptMode(mode, value))

  const codingSummary = [
    coding?.approval ? 'Require approval' : null,
    coding?.babysit ? 'Babysit' : null,
  ]
    .filter(Boolean)
    .join(', ')

  const kubernetesSummary = [
    kubernetes?.update ? 'Allow updates' : null,
    kubernetes?.delete ? 'Allow deletes' : null,
  ]
    .filter(Boolean)
    .join(', ')

  const codingEnabled = coding != null
  const kubernetesEnabled = !!kubernetes?.update || !!kubernetes?.delete
  const selectedActionKeys = useMemo(() => {
    const keys = new Set<Key>()
    if (codingEnabled) keys.add('coding')
    if (kubernetesEnabled) keys.add('kubernetes')
    return keys
  }, [codingEnabled, kubernetesEnabled])
  const actionsSummary = [
    codingEnabled ? CODING_AGENT_LABEL : null,
    kubernetesEnabled ? KUBERNETES_ACTIONS_LABEL : null,
  ]
    .filter(Boolean)
    .join(', ')

  const setSelectedActions = (keys: Set<Key>) => {
    const nextCoding = keys.has('coding')
    const nextKubernetes = keys.has('kubernetes')
    onChange({
      ...value,
      plan: false,
      coding: nextCoding ? (value?.coding ?? {}) : null,
      kubernetes: nextKubernetes
        ? enableKubernetesModes(value?.kubernetes)
        : disableKubernetesModes(value?.kubernetes),
    })
    setOpenPanel((panel) => {
      if (panel === 'coding' && !nextCoding) return null
      if (panel === 'kubernetes' && !nextKubernetes) return null
      return panel
    })
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
    >
      <div>
        <Body2BoldP css={{ marginBottom: theme.spacing.small }}>
          Modes
        </Body2BoldP>
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: theme.spacing.xsmall,
          }}
        >
          <ModeCard
            active={selectedMode === 'agent'}
            disabled={disabled}
            label={WRITE_MODE_LABEL}
            description={WRITE_MODE_HINT}
            icon={<DiscoverIcon size={16} />}
            onClick={() => setMode('agent')}
          />
          <ModeCard
            active={selectedMode === 'plan'}
            disabled={disabled}
            label={READ_MODE_LABEL}
            description="Run entirely in read-only mode. No PRs will be created, use for exploring infrastructure or root cause analysis."
            icon={<ListIcon size={16} />}
            onClick={() => setMode('plan')}
          />
        </div>
      </div>

      {selectedMode === 'agent' && (
        <Card
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
            padding: theme.spacing.large,
            background: theme.colors['fill-two'],
            border: theme.borders['fill-two'],
          }}
        >
          <Select
            label="Select actions"
            selectionMode="multiple"
            selectedKeys={selectedActionKeys}
            onSelectionChange={setSelectedActions}
            placement="left"
            isDisabled={disabled}
            triggerButton={
              <SelectButton css={{ width: '100%' }}>
                {actionsSummary || 'Select actions'}
              </SelectButton>
            }
          >
            <ListBoxItem
              key="coding"
              label={CODING_AGENT_LABEL}
              description={WRITE_MODE_HINT}
              leftContent={<DiscoverIcon size={16} />}
              rightContent={
                <Chip
                  size="small"
                  severity="neutral"
                >
                  Default
                </Chip>
              }
            />
            <ListBoxItem
              key="kubernetes"
              label="Kubernetes actions"
              description={KUBERNETES_ACTIONS_HINT}
              leftContent={<KubernetesIcon size={16} />}
            />
          </Select>

          <Flex
            direction="column"
            gap="medium"
          >
            <ModeActionRow
              icon={<DiscoverIcon size={16} />}
              label={CODING_AGENT_LABEL}
              description={WRITE_MODE_HINT}
              disabled={disabled || !codingEnabled}
              summary={codingSummary || 'Configure supervision'}
              isOpen={openPanel === 'coding'}
              onOpenChange={(open) => setOpenPanel(open ? 'coding' : null)}
            >
              <WorkbenchCodingSupervisionFields
                approval={!!coding?.approval}
                babysit={!!coding?.babysit}
                onApprovalChange={(approval) =>
                  onChange(updateCodingModes(value, { approval }))
                }
                onBabysitChange={(babysit) =>
                  onChange(updateCodingModes(value, { babysit }))
                }
              />
            </ModeActionRow>

            <ModeActionRow
              icon={<KubernetesIcon size={16} />}
              label={KUBERNETES_ACTIONS_LABEL}
              description={KUBERNETES_ACTIONS_HINT}
              disabled={disabled || !kubernetesEnabled}
              summary={kubernetesSummary || 'Configure actions'}
              isOpen={openPanel === 'kubernetes'}
              onOpenChange={(open) => setOpenPanel(open ? 'kubernetes' : null)}
            >
              <WorkbenchKubernetesMutationFields
                allowUpdates={!!kubernetes?.update}
                allowDeletes={!!kubernetes?.delete}
                onAllowUpdatesChange={(checked) => {
                  onChange({
                    ...value,
                    plan: false,
                    kubernetes: {
                      ...value?.kubernetes,
                      update: checked,
                      delete: value?.kubernetes?.delete ?? false,
                    },
                  })
                  if (!checked && !kubernetes?.delete) setOpenPanel(null)
                }}
                onAllowDeletesChange={(checked) => {
                  onChange({
                    ...value,
                    plan: false,
                    kubernetes: {
                      ...value?.kubernetes,
                      update: value?.kubernetes?.update ?? false,
                      delete: checked,
                    },
                  })
                  if (!checked && !kubernetes?.update) setOpenPanel(null)
                }}
              />
            </ModeActionRow>

            <div
              css={{
                opacity: kubernetesEnabled ? 1 : 0.7,
                pointerEvents: kubernetesEnabled ? undefined : 'none',
              }}
            >
              <WorkbenchKubernetesNamespaceFields
                value={value}
                onChange={onChange}
              />
            </div>
          </Flex>
        </Card>
      )}

      <Flex
        direction="column"
        gap="medium"
      >
        <OverlineH3 $color="text-xlight">Global settings</OverlineH3>
        <WorkbenchVerificationLoopControl
          checked={value?.verification ?? false}
          disabled={disabled}
          onChange={(verification) => onChange({ ...value, verification })}
        />
        <WorkbenchBudgetLimitControl
          workbenchId={workbenchId}
          value={value?.budget}
          onChange={(budget) => onChange(updateBudgetModes(value, budget))}
          disabled={disabled}
        />
      </Flex>
    </Flex>
  )
}

function WorkbenchKubernetesNamespaceFields({
  value,
  onChange,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
}) {
  const kubernetes = value?.kubernetes
  const requireNamespaces = (kubernetes?.requireNamespaces ?? []).filter(
    (ns): ns is string => !!ns
  )
  const excludeNamespaces = (kubernetes?.excludeNamespaces ?? []).filter(
    (ns): ns is string => !!ns
  )

  const setNamespaces = (
    patch: Partial<{
      requireNamespaces: string[]
      excludeNamespaces: string[]
    }>
  ) =>
    onChange({
      ...value,
      kubernetes: {
        update: kubernetes?.update ?? false,
        delete: kubernetes?.delete ?? false,
        requireNamespaces,
        excludeNamespaces,
        ...kubernetes,
        ...patch,
      },
    })

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <NamespaceListField
        label="Required namespaces"
        hint="If set, actions are only allowed inside these namespaces. Leave empty to allow all (except the blacklist). Press Enter to add."
        values={requireNamespaces}
        onChange={(next) => setNamespaces({ requireNamespaces: next })}
      />
      <NamespaceListField
        label="Blacklisted namespaces"
        hint="The agent can never act in these namespaces, even if they're in the required set. Press Enter to add."
        values={excludeNamespaces}
        severity="danger"
        onChange={(next) => setNamespaces({ excludeNamespaces: next })}
      />
    </Flex>
  )
}

function NamespaceListField({
  label,
  hint,
  values,
  severity,
  onChange,
}: {
  label: string
  hint: string
  values: string[]
  severity?: 'danger'
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()
  const canAdd = !!trimmed && !values.includes(trimmed)

  const addNamespace = () => {
    if (!canAdd) {
      setDraft('')
      return
    }
    onChange([...values, trimmed])
    setDraft('')
  }

  return (
    <FormField
      label={label}
      hint={hint}
    >
      <Flex
        direction="column"
        gap="xsmall"
        width="100%"
      >
        <Input2
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            addNamespace()
          }}
          placeholder="Enter namespace name"
        />
        {values.length > 0 && (
          <ChipList
            values={values}
            limit={Infinity}
            size="small"
            closeButton
            severity={severity}
            emptyState={null}
            onClickCondition={() => true}
            onClick={(value) => onChange(values.filter((ns) => ns !== value))}
          />
        )}
      </Flex>
    </FormField>
  )
}

function ModeActionRow({
  icon,
  label,
  description,
  disabled = false,
  summary,
  isOpen,
  onOpenChange,
  children,
}: {
  icon: ReactNode
  label: string
  description: string
  disabled?: boolean
  summary: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const theme = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    width: 360,
    maxHeight: 480,
    minHeight: 0,
    placement: 'right',
  })
  const { buttonProps } = useButton(
    {
      onPress: () => !disabled && onOpenChange(!isOpen),
      isDisabled: disabled,
    },
    triggerRef
  )

  return (
    <Flex
      align="center"
      gap="large"
      css={{
        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : undefined,
      }}
    >
      <Flex
        direction="column"
        gap="xxsmall"
        flex={1}
        minWidth={0}
      >
        <Flex
          align="center"
          gap="xsmall"
        >
          {icon}
          <Body2P>{label}</Body2P>
        </Flex>
        <Body2P $color="text-xlight">{description}</Body2P>
      </Flex>
      <div css={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          ref={mergedTriggerRef}
          {...buttonProps}
          disabled={disabled}
          css={{
            ...theme.partials.reset.button,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.small,
            width: '100%',
            padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            color: theme.colors['text-xlight'],
            background: theme.colors['fill-one'],
            border: theme.borders.input,
            borderRadius: theme.borderRadiuses.medium,
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
          }}
        >
          <Body2P
            $color="text-xlight"
            css={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {summary}
          </Body2P>
          <CaretDownIcon
            size={16}
            css={{
              transform: isOpen ? 'scaleY(-1)' : 'scaleY(1)',
              transition: 'transform 0.1s ease',
              flexShrink: 0,
            }}
          />
        </button>
        <WorkbenchPromptPopover
          isOpen={!disabled && isOpen}
          onClose={() => onOpenChange(false)}
          floating={floating}
        >
          <Card
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.small,
              width: 360,
              padding: theme.spacing.medium,
              background: theme.colors['fill-two-selected'],
              border: theme.borders['fill-two'],
              boxShadow: theme.boxShadows.moderate,
            }}
          >
            {children}
          </Card>
        </WorkbenchPromptPopover>
      </div>
    </Flex>
  )
}

function ModeCard({
  active,
  disabled = false,
  label,
  description,
  icon,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  label: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  const theme = useTheme()

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      css={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.small,
        minHeight: 108,
        padding: theme.spacing.medium,
        color: theme.colors.text,
        textAlign: 'left',
        background: 'transparent',
        border: active ? theme.borders.input : theme.borders.default,
        borderRadius: theme.borderRadiuses.medium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span
        css={{
          width: 16,
          height: 16,
          marginTop: 2,
          borderRadius: '50%',
          border: `1px solid ${active ? theme.colors['border-selected'] : theme.colors['border-input']}`,
          boxShadow: active
            ? `inset 0 0 0 3px ${theme.colors['fill-two']}`
            : undefined,
          background: active ? theme.colors['action-primary'] : 'transparent',
          flexShrink: 0,
        }}
      />
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Flex
          align="center"
          gap="xsmall"
        >
          {icon}
          <Body2BoldP>{label}</Body2BoldP>
        </Flex>
        <Body2P $color="text-xlight">{description}</Body2P>
      </Flex>
    </button>
  )
}
