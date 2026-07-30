import {
  AddIcon,
  Card,
  CaretRightIcon,
  Checkbox,
  CloseIcon,
  ContainerRuntimeIcon,
  DiscoverIcon,
  Flex,
  KubernetesIcon,
  ListIcon,
  Switch,
  useFloatingDropdown,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import type { WorkbenchJobModesAttributes } from 'generated/graphql'
import {
  cloneElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useButton } from 'react-aria'
import { useTheme } from 'styled-components'
import {
  WorkbenchBudgetAmountControl,
  formatBudgetLimitLabel,
} from './WorkbenchBudgetLimit'
import { WorkbenchPromptPopover } from './WorkbenchPromptModeSelector'
import { WorkbenchPromptSupervisionOption } from './WorkbenchPromptSupervisionOption'
import { updateBudgetModes } from './workbenchPromptModes'

const PANEL_WIDTH = 373
const SIDE_PANEL_WIDTH = 394
type SidePanel = 'coding' | 'kubernetes'

export function WorkbenchPromptOptionsSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(null)
  const readMode = !!value?.plan
  const codingEnabled = value?.coding != null
  const kubernetesEnabled =
    !!value?.kubernetes?.update || !!value?.kubernetes?.delete
  const tokenLimitEnabled =
    value?.budget?.tokens != null || value?.budget?.cost != null
  const contentWidth = PANEL_WIDTH + (sidePanel ? SIDE_PANEL_WIDTH : 0)
  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    width: contentWidth,
    minWidth: contentWidth,
    maxHeight: 600,
    minHeight: 0,
    placement: 'left',
  })
  const { buttonProps } = useButton(
    {
      onPress: () => !disabled && setIsOpen((open) => !open),
      isDisabled: disabled,
    },
    triggerRef
  )

  useLayoutEffect(() => {
    if (!isOpen) return
    void floating.update()
  }, [contentWidth, isOpen, floating])

  const trigger = (
    <ChatOptionPill
      isOpen={isOpen}
      showArrow={false}
      disabled={disabled}
      aria-label="Configure modes and token limit"
      css={{
        width: 32,
        height: '100%',
        justifyContent: 'center',
        padding: 0,
        borderRadius: '50%',
      }}
    >
      <AddIcon size={12} />
    </ChatOptionPill>
  )

  return (
    <>
      {cloneElement(trigger, {
        ref: mergedTriggerRef,
        ...buttonProps,
        ...(isOpen ? { style: { zIndex: theme.zIndexes.tooltip + 1 } } : {}),
      })}
      <WorkbenchPromptPopover
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setSidePanel(null)
        }}
        floating={floating}
        style={{
          width: contentWidth,
          minWidth: contentWidth,
          maxWidth: contentWidth,
          clipPath: 'none',
        }}
      >
        <Flex align="stretch">
          <Card
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
              width: PANEL_WIDTH,
              flexShrink: 0,
              padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
              backgroundColor: theme.colors['fill-two'],
              border: 'none',
              borderRadius: sidePanel
                ? `${theme.borderRadiuses.large}px 0 0 ${theme.borderRadiuses.large}px`
                : theme.borderRadiuses.large,
              boxShadow: theme.boxShadows.moderate,
            }}
          >
            <PromptOptionSwitch
              label="Read mode"
              hint="Agents explore and report, no PRs are created."
              checked={readMode}
              onChange={(checked) => {
                if (checked) setSidePanel(null)
                onChange(
                  checked
                    ? {
                        ...value,
                        plan: true,
                        coding: undefined,
                        kubernetes: { update: false, delete: false },
                      }
                    : { ...value, plan: false }
                )
              }}
            />

            {!readMode && (
              <Flex
                direction="column"
                gap="small"
              >
                <PromptOptionCheckbox
                  label="Coding agent"
                  hint="Edits code and opens PRs"
                  icon={<DiscoverIcon size={12} />}
                  checked={codingEnabled}
                  active={sidePanel === 'coding'}
                  onOpen={() => {
                    if (sidePanel === 'coding') {
                      setSidePanel(null)
                      return
                    }
                    if (!codingEnabled)
                      onChange({ ...value, plan: false, coding: {} })
                    setSidePanel('coding')
                  }}
                  onChange={(checked) => {
                    onChange({
                      ...value,
                      plan: false,
                      coding: checked ? (value?.coding ?? {}) : null,
                    })
                    setSidePanel(checked ? 'coding' : null)
                  }}
                />
                <PromptOptionCheckbox
                  label="Enable Kubernetes actions"
                  hint="Applies changes to live clusters"
                  icon={<KubernetesIcon size={12} />}
                  checked={kubernetesEnabled}
                  active={sidePanel === 'kubernetes'}
                  onOpen={() => {
                    if (sidePanel === 'kubernetes') {
                      setSidePanel(null)
                      return
                    }
                    if (!kubernetesEnabled)
                      onChange({
                        ...value,
                        plan: false,
                        kubernetes: { update: true, delete: true },
                      })
                    setSidePanel('kubernetes')
                  }}
                  onChange={(checked) => {
                    onChange({
                      ...value,
                      plan: false,
                      kubernetes: checked
                        ? kubernetesEnabled
                          ? value?.kubernetes
                          : { update: true, delete: true }
                        : { update: false, delete: false },
                    })
                    setSidePanel(checked ? 'kubernetes' : null)
                  }}
                />
              </Flex>
            )}

            <Divider />
            <PromptOptionSwitch
              label="Verification loop"
              hint="Auto-trigger a verification loop after PRs."
              checked={value?.verification ?? false}
              onChange={(verification) => onChange({ ...value, verification })}
            />
            <Divider />
            <PromptOptionSwitch
              label="Set token limit"
              hint="Set a dollar or token limit. Default is unlimited."
              checked={tokenLimitEnabled}
              onChange={(checked) =>
                onChange(
                  updateBudgetModes(
                    value,
                    checked ? { tokens: 0, cost: null } : undefined
                  )
                )
              }
            />
            {tokenLimitEnabled && (
              <WorkbenchBudgetAmountControl
                value={value?.budget}
                onChange={(budget) =>
                  onChange(updateBudgetModes(value, budget))
                }
                disabled={disabled}
                stacked
              />
            )}
          </Card>
          {sidePanel === 'coding' && (
            <CodingSidePanel
              value={value}
              onChange={onChange}
            />
          )}
          {sidePanel === 'kubernetes' && (
            <KubernetesSidePanel
              value={value}
              onChange={onChange}
              onEmpty={() => setSidePanel(null)}
            />
          )}
        </Flex>
      </WorkbenchPromptPopover>
    </>
  )
}

export function WorkbenchPromptOptionPills({
  value,
  onChange,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
}) {
  const budgetLabel = formatBudgetLimitLabel(value?.budget)
  const showRead = !!value?.plan
  const showCoding = !showRead && value?.coding != null
  const showKubernetes =
    !showRead && (!!value?.kubernetes?.update || !!value?.kubernetes?.delete)

  return (
    <>
      {showRead && (
        <SelectedOptionPill
          label="Read"
          icon={<ListIcon size={12} />}
          onClear={() =>
            onChange({
              ...value,
              plan: undefined,
            })
          }
        />
      )}
      {showCoding && (
        <SelectedOptionPill
          label="Coding"
          icon={<DiscoverIcon size={12} />}
          optionIcons={
            <>
              {value?.coding?.approval && (
                <WarningShieldIcon
                  size={12}
                  color="icon-light"
                />
              )}
              {value?.coding?.babysit && (
                <ContainerRuntimeIcon
                  size={12}
                  color="icon-light"
                />
              )}
            </>
          }
          onClear={() =>
            onChange({
              ...value,
              coding: null,
            })
          }
        />
      )}
      {showKubernetes && (
        <SelectedOptionPill
          label="Kubernetes"
          icon={<KubernetesIcon size={12} />}
          onClear={() =>
            onChange({
              ...value,
              kubernetes: { update: false, delete: false },
            })
          }
        />
      )}
      {budgetLabel && (
        <SelectedOptionPill
          label={budgetLabel}
          onClear={() => onChange(updateBudgetModes(value, undefined))}
        />
      )}
    </>
  )
}

function PromptOptionSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Flex
      align="flex-start"
      gap="small"
    >
      <Flex
        direction="column"
        gap="xxsmall"
        flex={1}
      >
        <Body2BoldP>{label}</Body2BoldP>
        <Body2P $color="text-xlight">{hint}</Body2P>
      </Flex>
      <Switch
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
    </Flex>
  )
}

function PromptOptionCheckbox({
  label,
  hint,
  icon,
  checked,
  active,
  onOpen,
  onChange,
}: {
  label: string
  hint: string
  icon: ReactNode
  checked: boolean
  active: boolean
  onOpen: () => void
  onChange: (checked: boolean) => void
}) {
  const theme = useTheme()

  return (
    <button
      type="button"
      onClick={onOpen}
      css={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.small,
        width: '100%',
        padding: theme.spacing.xsmall,
        color: theme.colors.text,
        textAlign: 'left',
        background: active ? theme.colors['fill-two-hover'] : 'transparent',
        border: 0,
        borderRadius: theme.borderRadiuses.medium,
        cursor: 'pointer',
        '&:hover': { background: theme.colors['fill-two-hover'] },
      }}
    >
      <span onClick={(event) => event.stopPropagation()}>
        <Checkbox
          small
          aria-label={label}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </span>
      <Flex
        direction="column"
        gap="xxsmall"
        flex={1}
      >
        <Flex
          align="center"
          gap="xsmall"
        >
          {icon}
          <Body2BoldP>{label}</Body2BoldP>
        </Flex>
        <Body2P $color="text-xlight">{hint}</Body2P>
      </Flex>
      {checked && (
        <CaretRightIcon
          size={12}
          color={active ? 'icon-default' : 'icon-light'}
          css={{ alignSelf: 'center', flexShrink: 0 }}
        />
      )}
    </button>
  )
}

function CodingSidePanel({
  value,
  onChange,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
}) {
  return (
    <SidePanelContainer>
      <Overline>Supervision</Overline>
      <WorkbenchPromptSupervisionOption
        icon={
          <WarningShieldIcon
            size={16}
            color="icon-light"
          />
        }
        label="Requires approval"
        hint="Pause for your sign-off before it edits anything or opens a PR."
        checked={!!value?.coding?.approval}
        onChange={(approval) =>
          onChange({
            ...value,
            plan: false,
            coding: { ...value?.coding, approval },
          })
        }
      />
      <WorkbenchPromptSupervisionOption
        icon={
          <ContainerRuntimeIcon
            size={16}
            color="icon-light"
          />
        }
        label="Babysit"
        hint="Stays active after opening the PR to monitor review feedback and requested changes, then follows up until it’s ready to merge."
        checked={!!value?.coding?.babysit}
        onChange={(babysit) =>
          onChange({
            ...value,
            plan: false,
            coding: { ...value?.coding, babysit },
          })
        }
      />
    </SidePanelContainer>
  )
}

function KubernetesSidePanel({
  value,
  onChange,
  onEmpty,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  onEmpty: () => void
}) {
  return (
    <SidePanelContainer>
      <Overline>Kubernetes actions</Overline>
      <Body2P $color="text-xlight">
        Reads are always permitted. Every mutation you enable below still
        requires your approval before it runs.
      </Body2P>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Checkbox
          small
          checked={!!value?.kubernetes?.update}
          onChange={(event) => {
            onChange({
              ...value,
              plan: false,
              kubernetes: {
                ...value?.kubernetes,
                update: event.target.checked,
              },
            })
            if (!event.target.checked && !value?.kubernetes?.delete) onEmpty()
          }}
        >
          Allow updates
        </Checkbox>
        <Checkbox
          small
          checked={!!value?.kubernetes?.delete}
          onChange={(event) => {
            onChange({
              ...value,
              plan: false,
              kubernetes: {
                ...value?.kubernetes,
                delete: event.target.checked,
              },
            })
            if (!event.target.checked && !value?.kubernetes?.update) onEmpty()
          }}
        >
          Allow deletes
        </Checkbox>
      </Flex>
    </SidePanelContainer>
  )
}

function SidePanelContainer({ children }: { children: ReactNode }) {
  const theme = useTheme()

  return (
    <Flex
      direction="column"
      gap="small"
      width={SIDE_PANEL_WIDTH}
      padding="medium"
      css={{
        flexShrink: 0,
        background: theme.colors['fill-two-selected'],
        border: theme.borders['fill-two'],
        borderRadius: `0 ${theme.borderRadiuses.large}px ${theme.borderRadiuses.large}px 0`,
        boxShadow: theme.boxShadows.moderate,
      }}
    >
      {children}
    </Flex>
  )
}

function SelectedOptionPill({
  label,
  icon,
  optionIcons,
  onClear,
}: {
  label: string
  icon?: ReactNode
  optionIcons?: ReactNode
  onClear: () => void
}) {
  return (
    <ChatOptionPill
      showArrow={false}
      css={{ height: '100%' }}
    >
      {icon}
      <span>{label}</span>
      {optionIcons}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Clear ${label}`}
        css={{ display: 'flex' }}
        onClick={(event) => {
          event.stopPropagation()
          onClear()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onClear()
        }}
      >
        <CloseIcon size={10} />
      </span>
    </ChatOptionPill>
  )
}

function Divider() {
  const theme = useTheme()

  return <div css={{ borderTop: theme.borders['fill-two'] }} />
}
