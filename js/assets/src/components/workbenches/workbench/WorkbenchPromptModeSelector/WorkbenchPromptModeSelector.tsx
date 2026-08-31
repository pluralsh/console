import {
  AnimatedDiv,
  DiscoverIcon,
  ListIcon,
  orange,
  Popover,
  PopoverWrapper,
} from '@pluralsh/design-system'
import { type CSSProperties, type ReactNode } from 'react'
import { to, useTransition } from '@react-spring/web'
import { FloatingPortal, type UseFloatingReturn } from '@floating-ui/react'
import { type DefaultTheme, useTheme } from 'styled-components'
import { type WorkbenchPromptModeConfig } from './WorkbenchPromptModeDetails'
import { type WorkbenchPromptMode } from './workbenchPromptModes'

export function workbenchPromptPanelSurfaces(theme: DefaultTheme) {
  const isLight = theme.mode === 'light'

  return {
    panelBackground: isLight
      ? theme.colors['fill-zero']
      : theme.colors['fill-two'],
    detailBackground: isLight
      ? theme.colors['fill-zero-hover']
      : theme.colors['fill-two-selected'],
    modeItemBackground: isLight
      ? theme.colors['fill-zero-selected']
      : theme.colors['fill-two-hover'],
    panelBorder: isLight ? theme.borders.input : theme.borders['fill-two'],
  }
}

export const WORKBENCH_PROMPT_MODES: (WorkbenchPromptModeConfig & {
  mode: WorkbenchPromptMode
})[] = [
  {
    mode: 'agent',
    label: 'Coding agent',
    Icon: DiscoverIcon,
    description: 'Tune coding agent functionality for this job.',
    supervisionOptions: true,
  },
  {
    mode: 'plan',
    label: 'Plan',
    Icon: ListIcon,
    iconFill: orange[400],
    description:
      'Run entirely in read-only mode. No PRs will be created, use for exploring infrastructure or root cause analysis.',
  },
]

export function WorkbenchPromptPopover({
  isOpen,
  onClose,
  floating,
  children,
  style,
}: {
  isOpen: boolean
  onClose: () => void
  floating: UseFloatingReturn
  children: ReactNode
  style?: CSSProperties
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
        ref={floating.refs.setFloating}
        style={{
          position: floating.strategy,
          left: floating.x ?? 0,
          top: floating.y ?? 0,
          ...style,
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
