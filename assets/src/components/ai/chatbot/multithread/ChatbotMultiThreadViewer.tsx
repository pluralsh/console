import {
  Accordion,
  AccordionItem,
  SemanticSpacingKey,
} from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import { ChatThreadTinyFragment } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { MultiThreadViewerThreadMessages } from './MultiThreadViewerThreadMessages'

const DOT_SIZE = 8
const DOT_GAP = 16
const STEPPER_LEFT_OFFSET = 16
const THREAD_GAP: SemanticSpacingKey = 'small'
// trigger height with compact padding (padding + content + padding)
const TRIGGER_HEIGHT = 46

export function ChatbotMultiThreadViewer({
  threads,
  isExpectingStream = false,
}: {
  threads: ChatThreadTinyFragment[]
  isExpectingStream?: boolean
}) {
  const { borders, borderRadiuses } = useTheme()
  const threadIdList = threads.map((thread) => thread.id)
  return (
    <WrapperAccordionSC
      type="multiple"
      key={threadIdList.join('-')} // force re-render when threads change
      defaultValue={threadIdList}
    >
      {threads.map((thread) => (
        <StepperAccordionItemSC
          key={thread.id}
          value={thread.id}
          caret="right"
          padding="compact"
          paddingArea="trigger-only"
          triggerWrapperStyles={{
            border: borders['fill-three'],
            borderRadius: borderRadiuses.large,
          }}
          trigger={
            <Body2P
              $color="text-light"
              css={TRUNCATE}
            >
              {thread.summary}
            </Body2P>
          }
        >
          <MultiThreadViewerThreadMessages
            thread={thread}
            isExpectingStream={isExpectingStream}
          />
        </StepperAccordionItemSC>
      ))}
    </WrapperAccordionSC>
  )
}

const WrapperAccordionSC = styled(Accordion)(({ theme }) => ({
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing[THREAD_GAP],
  paddingLeft: STEPPER_LEFT_OFFSET + DOT_SIZE / 2,
}))

const StepperAccordionItemSC = styled(AccordionItem)(({ theme }) => {
  return {
    position: 'relative',
    // dot - aligned with trigger center
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -(STEPPER_LEFT_OFFSET + DOT_SIZE / 2),
      top: TRIGGER_HEIGHT / 2 - DOT_SIZE / 2,
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: '50%',
      backgroundColor: theme.colors['border-fill-three'],
    },
    // line going down from dot - starts below dot with gap, extends into next item
    '&::after': {
      content: '""',
      position: 'absolute',
      width: 1,
      left: -(STEPPER_LEFT_OFFSET + 0.5),
      top: TRIGGER_HEIGHT / 2 + DOT_SIZE / 2 + DOT_GAP,
      bottom:
        DOT_GAP - theme.spacing[THREAD_GAP] - TRIGGER_HEIGHT / 2 + DOT_SIZE / 2,
      backgroundColor: theme.colors['border-fill-three'],
    },
    // last item: no line below
    '&:last-child::after': { display: 'none' },
  }
})
