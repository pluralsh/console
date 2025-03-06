import {
  LogsIcon,
  Modal,
  PrOpenIcon,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import {
  AiInsightEvidenceFragment,
  EvidenceType,
  LogsEvidenceFragment,
  PullRequestEvidenceFragment,
} from 'generated/graphql'
import { groupBy, isEmpty } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { LogsEvidencePanel } from './LogsEvidencePanel'
import { PrEvidenceDetails } from './PrEvidenceDetails'
import { GroupedPrEvidence, PrEvidencePanel } from './PrEvidencePanel'

const DELIMITER = '<DELIM>' // arbitrary delimiter that will probably never be in a URL

export function InsightEvidence({
  evidence,
}: {
  evidence: AiInsightEvidenceFragment[]
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [selectedPr, setSelectedPr] = useState<GroupedPrEvidence | null>(null)

  const { logEvidence, prEvidence } = useMemo(() => {
    return aggregateInsightEvidence(evidence)
  }, [evidence])

  const [evidenceType, setEvidenceType] = useState(
    !isEmpty(logEvidence) ? EvidenceType.Log : EvidenceType.Pr
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
        {!isEmpty(logEvidence) ? (
          <Tab
            startIcon={<LogsIcon />}
            key={EvidenceType.Log}
          >
            Logs
          </Tab>
        ) : null}
        {!isEmpty(prEvidence) ? (
          <Tab
            startIcon={<PrOpenIcon />}
            key={EvidenceType.Pr}
          >
            Pull Requests
          </Tab>
        ) : null}
      </TabList>
      {evidenceType === EvidenceType.Log ? (
        <LogsEvidencePanel logs={logEvidence} />
      ) : (
        <PrEvidencePanel
          prs={prEvidence}
          setSelectedPr={setSelectedPr}
        />
      )}
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
    </WrapperSC>
  )
}

export const aggregateInsightEvidence = (
  evidence: AiInsightEvidenceFragment[]
) => {
  const logEvidence: LogsEvidenceFragment[] = []
  const prEvidence: PullRequestEvidenceFragment[] = []

  evidence?.forEach(({ type, logs, pullRequest: pr }) => {
    if (type === EvidenceType.Log && logs) logEvidence.push(logs)
    else if (type === EvidenceType.Pr && pr) prEvidence.push(pr)
  })

  const groupedPrEvidence: GroupedPrEvidence[] = Object.entries(
    groupBy(prEvidence, (pr) => `${pr.url}${DELIMITER}${pr.title}`)
  ).map(([key, files]) => ({
    url: key.split(DELIMITER)[0],
    title: key.split(DELIMITER)[1],
    files,
  }))

  return { logEvidence, prEvidence: groupedPrEvidence }
}

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
})
