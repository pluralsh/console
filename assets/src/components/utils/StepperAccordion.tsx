import {
  Accordion,
  AccordionItem,
  SemanticColorKey,
  SemanticSpacingKey,
} from '@pluralsh/design-system'
import styled from 'styled-components'

const DOT_SIZE = 8
const DOT_GAP = 16
const STEPPER_LEFT_OFFSET = 16
// trigger height with compact padding (padding + content + padding)
const TRIGGER_HEIGHT = 46

const STEPPER_GUTTER = STEPPER_LEFT_OFFSET + DOT_SIZE / 2
const LINE_LEFT = DOT_SIZE / 2 - 0.5

export const StepperAccordionSC = styled(Accordion)<{
  $gap: SemanticSpacingKey
}>(({ theme, $gap }) => ({
  background: 'none',
  border: 'none',
  boxShadow: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing[$gap],
}))

export const StepperAccordionItemSC = styled(AccordionItem)<{
  $gap: SemanticSpacingKey
  $dotColor?: SemanticColorKey
  $isLast?: boolean
}>(({ theme, $gap, $dotColor, $isLast }) => ({
  position: 'relative',
  paddingLeft: STEPPER_GUTTER,
  // dot aligned with trigger center
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: TRIGGER_HEIGHT / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: '50%',
    backgroundColor: theme.colors[$dotColor || 'border-fill-three'],
  },
  // line going down from dot, extends into next item's gap
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 1,
    left: LINE_LEFT,
    top: TRIGGER_HEIGHT / 2 + DOT_SIZE / 2 + DOT_GAP,
    bottom: DOT_GAP - theme.spacing[$gap] - TRIGGER_HEIGHT / 2 + DOT_SIZE / 2,
    backgroundColor: theme.colors['border-fill-three'],
    ...($isLast !== undefined && { display: $isLast ? 'none' : 'block' }),
  },
  // css-only fallback for non-virtualized usage where :last-child is reliable
  ...($isLast === undefined && { '&:last-child::after': { display: 'none' } }),
}))
