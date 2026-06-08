import {
  AnimatedDiv,
  Card,
  CheckRoundedIcon,
  DiscoverIcon,
  Flex,
  ListIcon,
  LogsIcon,
  useFloatingDropdown,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { ChatOptionPill } from 'components/ai/chatbot/input/ChatInput'
import { cloneElement, type ReactNode, useRef, useState } from 'react'
import { useButton } from 'react-aria'
import { to, useTransition } from '@react-spring/web'
import {
  FloatingPortal,
  type UseFloatingReturn,
} from '@floating-ui/react-dom-interactions'
import { useTheme } from 'styled-components'
import { PopoverWrapper } from '../../../../../design-system/src/components/PopoverListBox'
import { Popover } from '../../../../../design-system/src/components/ReactAriaPopover'
import { orange } from '../../../../../design-system/src/theme/colors-base'
import type {
  WorkbenchJobCodingModesAttributes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'
import {
  WorkbenchPromptModeDetails,
  workbenchPromptModeIconColor,
  type WorkbenchPromptModeConfig,
} from './WorkbenchPromptModeDetails'
import {
  attributesForPromptMode,
  type WorkbenchPromptMode,
  updateCodingModes,
} from './workbenchPromptModes'

const PANEL_WIDTH = 640
const LEFT_PANE_WIDTH = 240
const RIGHT_PANE_WIDTH = 400

const PROMPT_MODES: (WorkbenchPromptModeConfig & {
  mode: WorkbenchPromptMode
})[] = [
  {
    mode: 'agent',
    label: 'Coding agent',
    Icon: DiscoverIcon,
    badge: { label: 'Can write', severity: 'success' },
    description:
      'Full access. Agents edit code, apply changes and open pull requests to fix what they find.',
    supervisionOptions: true,
  },
  {
    mode: 'plan',
    label: 'Plan',
    Icon: ListIcon,
    iconFill: orange[400],
    badge: { label: 'Read-only', severity: 'neutral' },
    description:
      'Investigates read-only and drafts a step-by-step plan you can hand off to an agent. Forces every tool read-only — no writes, no PRs.',
  },
]

export function WorkbenchPromptModeSelector({
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
  const [hoveredMode, setHoveredMode] = useState<WorkbenchPromptMode | null>(
    null
  )

  const selectedMode: WorkbenchPromptMode | null = value?.plan
    ? 'plan'
    : value?.coding != null
      ? 'agent'
      : null

  const { floating, triggerRef: mergedTriggerRef } = useFloatingDropdown({
    triggerRef,
    width: PANEL_WIDTH,
    maxHeight: 360,
    minHeight: 280,
    placement: 'left',
  })

  const { buttonProps } = useButton(
    {
      onPress: () => !disabled && setIsOpen((open) => !open),
      isDisabled: disabled,
    },
    triggerRef
  )

  const previewMode = hoveredMode ?? selectedMode ?? 'agent'
  const previewConfig = PROMPT_MODES.find((m) => m.mode === previewMode)!
  const selectedModeConfig = selectedMode
    ? PROMPT_MODES.find((m) => m.mode === selectedMode)
    : null

  const setCoding = (coding: WorkbenchJobCodingModesAttributes) =>
    onChange(
      updateCodingModes(
        selectedMode === 'agent'
          ? value
          : attributesForPromptMode('agent', value),
        coding
      )
    )

  const trigger = (
    <ChatOptionPill
      isOpen={isOpen}
      css={{ height: '100%' }}
    >
      {selectedModeConfig ? (
        <>
          <selectedModeConfig.Icon
            size={10}
            color={workbenchPromptModeIconColor(selectedModeConfig, theme)}
          />
          <span>{selectedModeConfig.label}</span>
        </>
      ) : (
        <>
          <LogsIcon size={10} />
          <span>Select mode</span>
        </>
      )}
    </ChatOptionPill>
  )

  return (
    <>
      {cloneElement(trigger, {
        ref: mergedTriggerRef,
        ...buttonProps,
        ...(isOpen ? { style: { zIndex: theme.zIndexes.tooltip + 1 } } : {}),
      })}
      <ModeDropdownPanel
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setHoveredMode(null)
        }}
        floating={floating}
      >
        <Card
          css={{
            display: 'flex',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: theme.colors['fill-two'],
            borderRadius: theme.borderRadiuses.large,
            border: theme.borders['fill-two'],
            boxShadow: theme.boxShadows.moderate,
          }}
        >
          <Flex
            direction="column"
            gap="small"
            css={{
              borderRight: theme.borders['fill-two'],
              width: LEFT_PANE_WIDTH,
              flexShrink: 0,
              padding: theme.spacing.medium,
            }}
          >
            <Overline>Mode</Overline>
            <Flex
              direction="column"
              gap="xxsmall"
            >
              {PROMPT_MODES.map(({ mode, ...config }) => {
                const selected = selectedMode === mode
                const hovered = hoveredMode === mode

                return (
                  <button
                    key={mode}
                    type="button"
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.xsmall,
                      width: '100%',
                      padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
                      border: 'none',
                      borderRadius: theme.borderRadiuses.medium,
                      backgroundColor:
                        selected || hovered
                          ? theme.colors['fill-three']
                          : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={() => setHoveredMode(mode)}
                    onMouseLeave={() => setHoveredMode(null)}
                    onClick={() =>
                      onChange(attributesForPromptMode(mode, value))
                    }
                  >
                    <Flex
                      align="center"
                      gap="xsmall"
                      flex={1}
                      minWidth={0}
                    >
                      <config.Icon
                        size={12}
                        color={workbenchPromptModeIconColor(config, theme)}
                      />
                      <span
                        css={{
                          ...theme.partials.text.body2,
                          color: theme.colors.text,
                        }}
                      >
                        {config.label}
                      </span>
                    </Flex>
                    {selected && (
                      <CheckRoundedIcon
                        size={16}
                        color="icon-default"
                      />
                    )}
                  </button>
                )
              })}
            </Flex>
          </Flex>
          <Flex
            css={{
              backgroundColor: theme.colors['fill-two-selected'],
              width: RIGHT_PANE_WIDTH,
              flexShrink: 0,
              padding: theme.spacing.medium,
            }}
          >
            <WorkbenchPromptModeDetails
              config={previewConfig}
              mode={previewMode}
              approval={!!value?.coding?.approval}
              babysit={!!value?.coding?.babysit}
              onApprovalChange={(approval) => setCoding({ approval })}
              onBabysitChange={(babysit) => setCoding({ babysit })}
            />
          </Flex>
        </Card>
      </ModeDropdownPanel>
    </>
  )
}

function ModeDropdownPanel({
  isOpen,
  onClose,
  floating,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  floating: UseFloatingReturn
  children: ReactNode
}) {
  const theme = useTheme()
  const direction = floating.placement.startsWith('bottom') ? -1 : 1
  const out = { opacity: 0, yOffset: 150 }
  const transitions = useTransition(isOpen ? [true] : [], {
    from: { ...out, delay: 1000 },
    enter: { opacity: 1, yOffset: 0 },
    leave: out,
    config: isOpen
      ? { mass: 0.6, tension: 280, velocity: 0.02 }
      : { mass: 0.6, tension: 400, velocity: 0.02, restVelocity: 0.1 },
  })

  return transitions((styles) => (
    <FloatingPortal id={theme.portals.default.id}>
      <PopoverWrapper
        $isOpen={isOpen}
        $placement={floating.placement}
        ref={floating.floating}
        style={{
          position: floating.strategy,
          left: floating.x ?? 0,
          top: floating.y ?? 0,
        }}
      >
        <AnimatedDiv
          css={{
            width: '100%',
            maxHeight: '100%',
            display: 'flex',
          }}
          style={{
            ...styles,
            transform: to(
              styles.yOffset,
              (value) => `translateY(${direction * value}px)`
            ),
          }}
        >
          <Popover
            isOpen={isOpen}
            onClose={onClose}
          >
            {children}
          </Popover>
        </AnimatedDiv>
      </PopoverWrapper>
    </FloatingPortal>
  ))
}
