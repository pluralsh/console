import * as RadixAccordion from '@radix-ui/react-accordion'
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
} from 'react'

import styled, {
  type DefaultTheme,
  css,
  keyframes,
  useTheme,
} from 'styled-components'

import { DropdownArrowIcon } from '../icons'

import Card from './Card'

export type AccordionProps = ComponentProps<typeof RadixAccordion.Root> &
  ComponentProps<typeof Card>

function Accordion({
  children,
  ...props
}: {
  children?:
    | ReactElement<typeof AccordionItem>
    | ReactElement<typeof AccordionItem>[]
  collapsible?: boolean
} & AccordionProps) {
  return (
    <RadixAccordion.Root
      asChild
      collapsible={props.collapsible ?? true}
      {...props}
    >
      <Card>{children}</Card>
    </RadixAccordion.Root>
  )
}

function AccordionItem({
  value,
  padding = 'relaxed',
  paddingArea = 'all',
  caret = 'right',
  trigger,
  children,
  ...props
}: {
  value?: string
  padding?: 'none' | 'compact' | 'relaxed'
  paddingArea?: 'trigger-only' | 'all'
  caret?: 'none' | 'left' | 'right'
  trigger: ReactNode
  children: ReactNode
} & Omit<ComponentProps<typeof RadixAccordion.Item>, 'value'>) {
  const theme = useTheme()
  const paddingSize = getPaddingSize(theme, padding)
  const defaultValue = useId()

  return (
    <ItemSC
      value={value ?? defaultValue}
      {...props}
    >
      <RadixAccordion.Header asChild>
        <TriggerSC
          $caret={caret}
          $padding={paddingSize}
        >
          {trigger}
          {caret !== 'none' && (
            <DropdownArrowIcon
              className="icon"
              size={14}
            />
          )}
        </TriggerSC>
      </RadixAccordion.Header>
      <ContentSC>
        <div
          style={
            paddingArea === 'all'
              ? {
                  paddingRight: paddingSize,
                  paddingBottom: paddingSize,
                  paddingLeft: paddingSize,
                }
              : {}
          }
        >
          {children}
        </div>
      </ContentSC>
    </ItemSC>
  )
}

function getPaddingSize(
  theme: DefaultTheme,
  size: 'none' | 'compact' | 'relaxed'
) {
  switch (size) {
    case 'relaxed':
      return theme.spacing.medium
    case 'compact':
      return theme.spacing.small
    default:
      return 0
  }
}

const ItemSC = styled(RadixAccordion.Item)({
  display: 'flex',
  '&[data-orientation="vertical"]': {
    flexDirection: 'column',
  },
  '&[data-orientation="horizontal"]': {
    flexDirection: 'row',
  },
})

const TriggerSC = styled(RadixAccordion.Trigger)<{
  $caret: 'none' | 'left' | 'right'
  $padding?: number
}>(({ theme, $caret, $padding }) => ({
  ...theme.partials.reset.button,
  ...($padding ? { padding: $padding } : {}),
  display: 'flex',
  flexDirection: $caret === 'left' ? 'row-reverse' : 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  '.icon': {
    color: theme.colors['icon-xlight'],
    transform: 'scaleY(100%)',
    transition: 'transform 0.3s ease',
  },
  '&:hover': {
    '.icon': {
      transform: 'scale(115%)',
    },
  },
  '&:focus-visible': {
    ...theme.partials.focus.default,
  },
  '&[data-state="open"] .icon': {
    transform: 'scaleY(-100%)',
  },
}))

const slideAnimation = (
  direction: 'in' | 'out',
  orientation: 'height' | 'width'
) => keyframes`
  from {
    ${orientation}: ${
      direction === 'out'
        ? '0'
        : `var(--radix-accordion-content-${orientation})`
    };
  }
  to {
    ${orientation}: ${
      direction === 'out'
        ? `var(--radix-accordion-content-${orientation})`
        : '0'
    };
  }
`
const ContentSC = styled(RadixAccordion.Content)`
  overflow: hidden;
  & > div {
    height: 100%;
    width: 100%;
  }
  &[data-state='open'][data-orientation='vertical'] {
    animation: ${css`
        ${slideAnimation('out', 'height')}`} 300ms ease-out;
  }
  &[data-state='closed'][data-orientation='vertical'] {
    animation: ${css`
        ${slideAnimation('in', 'height')}`} 300ms ease-out;
  }
  &[data-state='open'][data-orientation='horizontal'] {
    animation: ${css`
        ${slideAnimation('out', 'width')}`} 300ms ease-out;
  }
  &[data-state='closed'][data-orientation='horizontal'] {
    animation: ${css`
        ${slideAnimation('in', 'width')}`} 300ms ease-out;
  }
`

export default Accordion
export { AccordionItem }
