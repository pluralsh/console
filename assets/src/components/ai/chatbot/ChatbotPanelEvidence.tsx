import { Divider, Flex } from '@pluralsh/design-system'
import { Body1P, CaptionP } from 'components/utils/typography/Text'
import { AiInsightEvidenceFragment, EvidenceType } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ReactElement, useMemo } from 'react'
import styled from 'styled-components'
import { AlertsEvidencePanel } from '../insights/AlertEvidencePanel'
import {
  aggregateInsightEvidence,
  evidenceDirectory,
  EvidenceEntryItem,
} from '../insights/InsightEvidence'
import { KnowledgeEvidencePanel } from '../insights/KnowledgeEvidencePanel'
import { LogsEvidencePanel } from '../insights/LogsEvidencePanel'
import { PrLinkoutCard } from './ChatMessage'

export function ChatbotPanelEvidence({
  evidence,
  headerText = 'This chat was created from an insight based on the evidence below:',
}: {
  evidence: AiInsightEvidenceFragment[]
  headerText?: string
}) {
  const aggregatedEvidence = useMemo(
    () => aggregateInsightEvidence(evidence),
    [evidence]
  )
  return (
    <WrapperSC>
      <Divider backgroundColor="fill-three" />
      <Body1P
        css={{ fontStyle: 'italic' }}
        $color="text-light"
      >
        {headerText}
      </Body1P>
      {Object.entries(aggregatedEvidence).map(
        ([evidenceType, evidence], i) =>
          !isEmpty(evidence) && (
            <Flex
              key={i}
              direction="column"
              gap="xxsmall"
            >
              <CaptionP $color="text-xlight">
                {evidenceDirectory[evidenceType].label}
              </CaptionP>
              <EvidenceEntry
                key={evidenceType}
                item={
                  { type: evidenceType, data: evidence } as EvidenceEntryItem
                }
              />
            </Flex>
          )
      )}
    </WrapperSC>
  )
}

function EvidenceEntry({
  item: { type, data },
}: {
  item: EvidenceEntryItem
  // should error if any EvidenceTypes aren't handled explicitly
}): ReactElement | ReactElement[] {
  switch (type) {
    case EvidenceType.Log:
      return (
        <LogsEvidencePanel
          isTable={false}
          logs={data}
        />
      )
    case EvidenceType.Pr:
      return (
        <Flex
          direction="column"
          gap="medium"
        >
          {data.map((item, i) => (
            <PrLinkoutCard
              key={i}
              url={item.url ?? ''}
              title={item.title ?? ''}
            />
          ))}
        </Flex>
      )
    case EvidenceType.Alert:
      return (
        <AlertsEvidencePanel
          alerts={data}
          isTable={false}
        />
      )
    case EvidenceType.Knowledge:
      return (
        <KnowledgeEvidencePanel
          knowledge={data}
          isTable={false}
        />
      )
  }
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: `${theme.spacing.large}px ${theme.spacing.xxxlarge}px ${theme.spacing.medium}px`,
}))
