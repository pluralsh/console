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

export const StepperAccordionSC = styled(Accordion)<{
  $gap: SemanticSpacingKey
}>(({ theme, $gap }) => ({
  background: 'none',
  border: 'none',
  boxShadow: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing[$gap],
  paddingLeft: STEPPER_LEFT_OFFSET + DOT_SIZE / 2,
}))

export const StepperAccordionItemSC = styled(AccordionItem)<{
  $gap: SemanticSpacingKey
  $dotColor?: SemanticColorKey
}>(({ theme, $gap, $dotColor }) => ({
  position: 'relative',
  // dot aligned with trigger center
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -(STEPPER_LEFT_OFFSET + DOT_SIZE / 2),
    top: TRIGGER_HEIGHT / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: '50%',
    backgroundColor: theme.colors[$dotColor || 'border-fill-three'],
  },
  // line going down from dot, extends into next item
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 1,
    left: -(STEPPER_LEFT_OFFSET + 0.5),
    top: TRIGGER_HEIGHT / 2 + DOT_SIZE / 2 + DOT_GAP,
    bottom: DOT_GAP - theme.spacing[$gap] - TRIGGER_HEIGHT / 2 + DOT_SIZE / 2,
    backgroundColor: theme.colors['border-fill-three'],
  },
  '&:last-child::after': { display: 'none' },
}))
