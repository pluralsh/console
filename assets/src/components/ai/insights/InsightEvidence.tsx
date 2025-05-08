import {
  BrainIcon,
  LogsIcon,
  Modal,
  PrOpenIcon,
  SirenIcon,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import {
  AiInsightEvidenceFragment,
  AlertEvidenceFragment,
  EvidenceType,
  KnowledgeEvidenceFragment,
  LogsEvidenceFragment,
  PullRequestEvidenceFragment,
} from 'generated/graphql'
import { groupBy, isEmpty } from 'lodash'
import { ReactElement, ReactNode, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { AlertsEvidencePanel } from './AlertEvidencePanel'
import { KnowledgeEvidencePanel } from './KnowledgeEvidencePanel'
import { LogsEvidencePanel } from './LogsEvidencePanel'
import { PrEvidenceDetails } from './PrEvidenceDetails'
import { GroupedPrEvidence, PrEvidencePanel } from './PrEvidencePanel'

export const DELIMITER = '<DELIM>' // arbitrary delimiter that will probably never be in a URL

type EvidenceTypeMap = {
  [EvidenceType.Log]: LogsEvidenceFragment[]
  [EvidenceType.Pr]: GroupedPrEvidence[]
  [EvidenceType.Alert]: AlertEvidenceFragment[]
  [EvidenceType.Knowledge]: KnowledgeEvidenceFragment[]
}
// this should error if an evidence type is added to "EvidenceType" that is not in "EvidenceTypeMap"
export type AggregatedInsightEvidence = {
  [Key in EvidenceType]: EvidenceTypeMap[Key]
}
export type EvidenceEntryItem = {
  [K in EvidenceType]: { type: K; data: AggregatedInsightEvidence[K] }
}[EvidenceType]

export const evidenceDirectory: Record<
  EvidenceType,
  { icon: ReactNode; label: string }
> = {
  [EvidenceType.Log]: { icon: <LogsIcon />, label: 'Logs' },
  [EvidenceType.Pr]: { icon: <PrOpenIcon />, label: 'PRs' },
  [EvidenceType.Alert]: { icon: <SirenIcon />, label: 'Alerts' },
  // TODO: change to knowledge icon when in DS
  [EvidenceType.Knowledge]: { icon: <BrainIcon />, label: 'Knowledge' },
}

export function InsightEvidence({
  evidence,
}: {
  evidence: AiInsightEvidenceFragment[]
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)

  const aggregatedEvidence = useMemo(
    () => aggregateInsightEvidence(evidence),
    [evidence]
  )

  const [evidenceType, setEvidenceType] = useState<EvidenceType | undefined>(
    () =>
      Object.entries(aggregatedEvidence).find(
        ([_, evidence]) => !isEmpty(evidence)
      )?.[0] as EvidenceType
  )

  return (
    <WrapperSC>
      <TabList
        css={{
          background: theme.colors['fill-two'],
          borderBottom: theme.borders.input,
        }}
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: evidenceType as string,
          onSelectionChange: setEvidenceType as any,
        }}
      >
        {Object.entries(aggregatedEvidence).map(([evidenceType, evidence]) =>
          !isEmpty(evidence) ? (
            <Tab
              key={evidenceType}
              startIcon={evidenceDirectory[evidenceType].icon}
              minWidth="fit-content"
            >
              {evidenceDirectory[evidenceType].label}
            </Tab>
          ) : null
        )}
      </TabList>
      {evidenceType && (
        <EvidencePanel
          evidence={
            {
              type: evidenceType,
              data: aggregatedEvidence[evidenceType],
            } as EvidenceEntryItem
          }
        />
      )}
    </WrapperSC>
  )
}

function EvidencePanel({
  evidence,
}: {
  evidence: EvidenceEntryItem
  // should error if any EvidenceTypes aren't handled explicitly
}): ReactElement {
  const [selectedPr, setSelectedPr] = useState<GroupedPrEvidence | null>(null)

  switch (evidence.type) {
    case EvidenceType.Log:
      return <LogsEvidencePanel logs={evidence.data} />
    case EvidenceType.Pr:
      return (
        <>
          <PrEvidencePanel
            prs={evidence.data}
            setSelectedPr={setSelectedPr}
          />
          <Modal
            open={!!selectedPr}
            onClose={() => setSelectedPr(null)}
            size="custom"
          >
            {selectedPr && (
              <PrEvidenceDetails
                pr={selectedPr}
                onGoBack={() => setSelectedPr(null)}
              />
            )}
          </Modal>
        </>
      )
    case EvidenceType.Alert:
      return <AlertsEvidencePanel alerts={evidence.data} />
    case EvidenceType.Knowledge:
      return <KnowledgeEvidencePanel knowledge={evidence.data} />
  }
}

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
})

export const aggregateInsightEvidence = (
  evidence: AiInsightEvidenceFragment[]
): AggregatedInsightEvidence => {
  const logEvidence: LogsEvidenceFragment[] = []
  const prEvidence: PullRequestEvidenceFragment[] = []
  const alertEvidence: AlertEvidenceFragment[] = []
  const knowledgeEvidence: KnowledgeEvidenceFragment[] = []

  evidence?.forEach(({ type, logs, pullRequest: pr, alert, knowledge }) => {
    if (type === EvidenceType.Log && logs) logEvidence.push(logs)
    else if (type === EvidenceType.Pr && pr) prEvidence.push(pr)
    else if (type === EvidenceType.Alert && alert) alertEvidence.push(alert)
    else if (type === EvidenceType.Knowledge && knowledge)
      knowledgeEvidence.push(knowledge)
  })

  const groupedPrEvidence: GroupedPrEvidence[] = Object.entries(
    groupBy(prEvidence, (pr) => `${pr.url}${DELIMITER}${pr.title}`)
  ).map(([key, files]) => ({
    url: key.split(DELIMITER)[0],
    title: key.split(DELIMITER)[1],
    files,
  }))

  return {
    [EvidenceType.Log]: logEvidence,
    [EvidenceType.Pr]: groupedPrEvidence,
    [EvidenceType.Alert]: alertEvidence,
    [EvidenceType.Knowledge]: knowledgeEvidence,
  }
}
