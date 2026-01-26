import { Accordion, AccordionItem, Markdown } from '@pluralsh/design-system'
import { AgentAnalysisFragment } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'

export function AgentRunAnalysis({
  analysis,
}: {
  analysis: AgentAnalysisFragment
}) {
  const { partials, colors } = useTheme()

  const sharedAccordionItemProps = {
    paddingArea: 'trigger-only' as const,
    triggerWrapperStyles: {
      ...partials.text.body2,
      background: colors['fill-one'],
    },
  }
  return (
    <Accordion
      type="multiple"
      defaultValue={['summary']}
      css={{ background: colors['fill-zero'] }}
    >
      <AccordionItem
        value="summary"
        trigger="High level summary"
        caret="none"
        css={{ pointerEvents: 'none' }}
        {...sharedAccordionItemProps}
      >
        <ContentWrapperSC>
          <Markdown text={analysis.summary ?? ''} />
        </ContentWrapperSC>
      </AccordionItem>
      <AccordionItem
        value="bullets"
        trigger="Summary"
        caret="left"
        {...sharedAccordionItemProps}
      >
        <ContentWrapperSC>
          <Markdown text={`- ${analysis.bullets?.join('\n- ') ?? ''}`.trim()} />
        </ContentWrapperSC>
      </AccordionItem>
      <AccordionItem
        value="analysis"
        trigger="Full analysis"
        caret="left"
        {...sharedAccordionItemProps}
      >
        <ContentWrapperSC>
          <Markdown text={analysis.analysis ?? ''} />
        </ContentWrapperSC>
      </AccordionItem>
    </Accordion>
  )
}

const ContentWrapperSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  padding: theme.spacing.large,
  '& ul': { paddingTop: 0 },
}))
