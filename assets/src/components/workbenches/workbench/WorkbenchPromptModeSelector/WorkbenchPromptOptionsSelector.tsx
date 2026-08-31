import {
  AddIcon,
  Card,
  CaretLeftIcon,
  CaretRightIcon,
  CloseIcon,
  DiscoverIcon,
  Flex,
  KubernetesIcon,
  ListIcon,
  Switch,
  useFloatingDropdown,
} from '@pluralsh/design-system'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import type {
  WorkbenchJobKubernetesModes,
  WorkbenchJobModes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'
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
import { WorkbenchBudgetSpendCapWarning } from './WorkbenchBudgetSpendCapWarning'
import {
  WorkbenchCodingSupervisionFields,
  WorkbenchKubernetesMutationFields,
} from './WorkbenchModeOptionFields'
import {
  WorkbenchPromptPopover,
  workbenchPromptPanelSurfaces,
} from './WorkbenchPromptModeSelector'
import {
  CODING_AGENT_LABEL,
  disableKubernetesModes,
  KUBERNETES_ACTIONS_LABEL,
  READ_MODE_LABEL,
  TOKEN_LIMIT_HINT,
  TOKEN_LIMIT_LABEL,
  updateBudgetModes,
  updateCodingModes,
  VERIFICATION_LOOP_HINT,
  VERIFICATION_LOOP_LABEL,
  WRITE_MODE_HINT,
  WRITE_MODE_LABEL,
} from './workbenchPromptModes'

const PANEL_WIDTH = 373
const PANEL_MAX_HEIGHT = 600
type SidePanel = 'coding' | 'kubernetes'

export function WorkbenchPromptOptionsSelector({
  workbenchId,
  value,
  onChange,
  disabled = false,
  workbenchModes,
}: {
  workbenchId?: Nullable<string>
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  disabled?: boolean
  workbenchModes?: WorkbenchJobModes | null
}) {
  const theme = useTheme()
  const { panelBackground, panelBorder } = workbenchPromptPanelSurfaces(theme)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(null)
  const [displayedSidePanel, setDisplayedSidePanel] =
    useState<SidePanel>('coding')
  const readMode = !!value?.plan
  const tokenLimitEnabled =
    value?.budget?.tokens != null || value?.budget?.cost != null
  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    width: PANEL_WIDTH,
    minWidth: PANEL_WIDTH,
    maxHeight: PANEL_MAX_HEIGHT,
    minHeight: 0,
    placement: 'left',
    flipFallbackStrategy: 'bestFit',
    flipBeforeSize: true,
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
  }, [isOpen, floating, tokenLimitEnabled, sidePanel])

  const openSidePanel = (panel: SidePanel) => {
    setDisplayedSidePanel(panel)
    setSidePanel(panel)
  }

  const trigger = (
    <ChatOptionPill
      isOpen={isOpen}
      showArrow={false}
      disabled={disabled}
      fillLevel={1}
      aria-label="Configure modes and token limit"
      css={{
        width: 32,
        height: 32,
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
          width: PANEL_WIDTH,
          minWidth: PANEL_WIDTH,
          maxWidth: PANEL_WIDTH,
          clipPath: 'none',
        }}
      >
        <Card
          css={{
            width: PANEL_WIDTH,
            maxHeight: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: 0,
            backgroundColor: panelBackground,
            border: theme.mode === 'light' ? panelBorder : 'none',
            borderRadius: theme.borderRadiuses.large,
            boxShadow: theme.boxShadows.moderate,
          }}
        >
          <div
            css={{
              display: 'flex',
              alignItems: 'stretch',
              width: PANEL_WIDTH * 2,
              maxHeight: '100%',
              minHeight: 0,
              transform: `translateX(${sidePanel ? -PANEL_WIDTH : 0}px)`,
              transition: 'transform 240ms ease-in-out',
              willChange: 'transform',
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
              },
            }}
          >
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.small,
                width: PANEL_WIDTH,
                flexShrink: 0,
                maxHeight: PANEL_MAX_HEIGHT,
                minHeight: 0,
                overflowY: 'auto',
                padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
                pointerEvents: sidePanel ? 'none' : undefined,
              }}
              aria-hidden={!!sidePanel}
              inert={!!sidePanel}
            >
              <PromptOptionSwitch
                label={readMode ? READ_MODE_LABEL : WRITE_MODE_LABEL}
                hint={
                  readMode
                    ? 'Agents explore and report, no PRs are created.'
                    : WRITE_MODE_HINT
                }
                checked={!readMode}
                onChange={(checked) => {
                  const nextReadMode = !checked
                  if (nextReadMode) setSidePanel(null)
                  onChange(
                    nextReadMode
                      ? {
                          ...value,
                          plan: true,
                          coding: undefined,
                          kubernetes: disableKubernetesModes(value?.kubernetes),
                        }
                      : { ...value, plan: false }
                  )
                }}
              />

              {!readMode && (
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  <PromptOptionRow
                    label={CODING_AGENT_LABEL}
                    hint="Edits code and opens PRs"
                    icon={<DiscoverIcon size={12} />}
                    onOpen={() => openSidePanel('coding')}
                  />
                  <PromptOptionRow
                    label={KUBERNETES_ACTIONS_LABEL}
                    hint="Applies changes to live clusters"
                    icon={<KubernetesIcon size={12} />}
                    onOpen={() => openSidePanel('kubernetes')}
                  />
                </Flex>
              )}

              <Divider />
              <PromptOptionSwitch
                label={VERIFICATION_LOOP_LABEL}
                hint={VERIFICATION_LOOP_HINT}
                checked={value?.verification ?? false}
                onChange={(verification) =>
                  onChange({ ...value, verification })
                }
              />
              <Divider />
              <PromptOptionSwitch
                label={TOKEN_LIMIT_LABEL}
                hint={TOKEN_LIMIT_HINT}
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
                <>
                  <WorkbenchBudgetAmountControl
                    value={value?.budget}
                    onChange={(budget) =>
                      onChange(updateBudgetModes(value, budget))
                    }
                    disabled={disabled}
                    stacked
                  />
                  <WorkbenchBudgetSpendCapWarning
                    workbenchId={workbenchId}
                    budget={value?.budget}
                  />
                </>
              )}
            </div>
            <SidePanelContainer
              onBack={() => setSidePanel(null)}
              hidden={!sidePanel}
            >
              {displayedSidePanel === 'coding' ? (
                <CodingSidePanel
                  value={value}
                  onChange={onChange}
                />
              ) : (
                <KubernetesSidePanel
                  value={value}
                  onChange={onChange}
                  onEmpty={() => setSidePanel(null)}
                  kubernetesModes={workbenchModes?.kubernetes}
                />
              )}
            </SidePanelContainer>
          </div>
        </Card>
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
    !showRead &&
    (!!value?.kubernetes?.update ||
      !!value?.kubernetes?.delete ||
      !!value?.kubernetes?.exec)

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
              kubernetes: disableKubernetesModes(value?.kubernetes),
            })
          }
        />
      )}
      {budgetLabel && (
        <BudgetLimitOptionPill
          amount={budgetLabel}
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
        <CaptionP $color="text-xlight">{hint}</CaptionP>
      </Flex>
      <Switch
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
    </Flex>
  )
}

function PromptOptionRow({
  label,
  hint,
  icon,
  onOpen,
}: {
  label: string
  hint: string
  icon: ReactNode
  onOpen: () => void
}) {
  const theme = useTheme()
  const { modeItemBackground } = workbenchPromptPanelSurfaces(theme)

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
        background: 'transparent',
        border: 0,
        borderRadius: theme.borderRadiuses.medium,
        cursor: 'pointer',
        '&:hover': { background: modeItemBackground },
      }}
    >
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
        <CaptionP $color="text-xlight">{hint}</CaptionP>
      </Flex>
      <CaretRightIcon
        size={12}
        color="icon-light"
        css={{ alignSelf: 'center', flexShrink: 0 }}
      />
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
    <>
      <WorkbenchCodingSupervisionFields
        approval={!!value?.coding?.approval}
        babysit={!!value?.coding?.babysit}
        review={!!value?.coding?.review}
        onApprovalChange={(approval) =>
          onChange(updateCodingModes(value, { approval }))
        }
        onBabysitChange={(babysit) =>
          onChange(updateCodingModes(value, { babysit }))
        }
        onReviewChange={(review) =>
          onChange(updateCodingModes(value, { review }))
        }
      />
    </>
  )
}

function KubernetesSidePanel({
  value,
  onChange,
  onEmpty,
  kubernetesModes,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  onEmpty: () => void
  kubernetesModes?: WorkbenchJobKubernetesModes | null
}) {
  return (
    <>
      <WorkbenchKubernetesMutationFields
        allowUpdates={!!value?.kubernetes?.update}
        allowDeletes={!!value?.kubernetes?.delete}
        allowExec={!!value?.kubernetes?.exec}
        updatesDisabled={!kubernetesModes?.update}
        deletesDisabled={!kubernetesModes?.delete}
        execDisabled={!kubernetesModes?.exec}
        onAllowUpdatesChange={(checked) => {
          onChange({
            ...value,
            plan: false,
            kubernetes: {
              ...value?.kubernetes,
              update: checked,
            },
          })
          if (
            !checked &&
            !value?.kubernetes?.delete &&
            !value?.kubernetes?.exec
          )
            onEmpty()
        }}
        onAllowDeletesChange={(checked) => {
          onChange({
            ...value,
            plan: false,
            kubernetes: {
              ...value?.kubernetes,
              delete: checked,
            },
          })
          if (
            !checked &&
            !value?.kubernetes?.update &&
            !value?.kubernetes?.exec
          )
            onEmpty()
        }}
        onAllowExecChange={(checked) => {
          onChange({
            ...value,
            plan: false,
            kubernetes: {
              ...value?.kubernetes,
              exec: checked,
            },
          })
          if (
            !checked &&
            !value?.kubernetes?.update &&
            !value?.kubernetes?.delete
          )
            onEmpty()
        }}
      />
    </>
  )
}

function SidePanelContainer({
  children,
  hidden,
  onBack,
}: {
  children: ReactNode
  hidden: boolean
  onBack: () => void
}) {
  const theme = useTheme()
  const { modeItemBackground, panelBorder } =
    workbenchPromptPanelSurfaces(theme)

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        width: PANEL_WIDTH,
        flexShrink: 0,
        maxHeight: PANEL_MAX_HEIGHT,
        minHeight: 0,
        overflowY: 'auto',
        padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        pointerEvents: hidden ? 'none' : undefined,
      }}
      aria-hidden={hidden}
      inert={hidden}
    >
      {children}
      <div
        css={{
          margin: `auto -${theme.spacing.medium}px -${theme.spacing.small}px`,
          borderTop: panelBorder,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          css={{
            ...theme.partials.reset.button,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xsmall,
            width: '100%',
            padding: `${theme.spacing.xsmall + theme.spacing.small / 2}px ${theme.spacing.medium}px`,
            color: theme.colors.text,
            cursor: 'pointer',
            '&:hover': { background: modeItemBackground },
          }}
        >
          <CaretLeftIcon
            size={12}
            color="icon-light"
          />
          <Body2P>Return to Menu</Body2P>
        </button>
      </div>
    </div>
  )
}

function BudgetLimitOptionPill({
  amount,
  onClear,
}: {
  amount: string
  onClear: () => void
}) {
  const theme = useTheme()

  return (
    <SelectedOptionPill
      label={
        <>
          {amount}{' '}
          <span css={{ color: theme.colors['text-input-disabled'] }}>
            limit
          </span>
        </>
      }
      clearLabel={`Clear ${amount} limit`}
      onClear={onClear}
    />
  )
}

function SelectedOptionPill({
  label,
  clearLabel,
  icon,
  onClear,
}: {
  label: ReactNode
  clearLabel?: string
  icon?: ReactNode
  onClear: () => void
}) {
  return (
    <ChatOptionPill
      showArrow={false}
      css={{
        height: 28,
        gap: 8,
      }}
    >
      {icon}
      <span>{label}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={
          clearLabel ?? `Clear ${typeof label === 'string' ? label : 'option'}`
        }
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
  const { panelBorder } = workbenchPromptPanelSurfaces(theme)

  return <div css={{ borderTop: panelBorder }} />
}
