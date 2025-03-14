import { Divider, Flex } from '@pluralsh/design-system'
import { Body1P } from 'components/utils/typography/Text'
import { AiInsightEvidenceFragment } from 'generated/graphql'
import styled from 'styled-components'
import { aggregateInsightEvidence } from '../insights/InsightEvidence'
import { LogsEvidencePanel } from '../insights/LogsEvidencePanel'
import { PrLinkoutCard } from './ChatMessage'

export function ChatbotPanelEvidence({
  evidence,
  headerText = 'This chat was created from an insight based on the evidence below:',
}: {
  evidence: AiInsightEvidenceFragment[]
  headerText?: string
}) {
  const { logEvidence, prEvidence } = aggregateInsightEvidence(evidence)
  return (
    <WrapperSC>
      <Divider backgroundColor="fill-three" />
      <Body1P
        css={{ fontStyle: 'italic' }}
        $color="text-light"
      >
        {headerText}
      </Body1P>
      <Flex
        direction="column"
        gap="medium"
      >
        {logEvidence.length > 0 && (
          <LogsEvidencePanel
            isTable={false}
            logs={logEvidence}
          />
        )}
        {prEvidence.map((item, i) => (
          <PrLinkoutCard
            key={i}
            url={item.url ?? ''}
            title={item.title ?? ''}
          />
        ))}
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.xxxlarge}px ${theme.spacing.medium}px`,
}))
