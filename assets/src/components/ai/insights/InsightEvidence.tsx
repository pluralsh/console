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
import { isEmpty } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { LogsEvidencePanel } from './LogsEvidencePanel'
import { PrEvidencePanel } from './PrEvidencePanel'
import { PrEvidenceDetails } from './PrEvidenceDetails'

export function InsightEvidence({
  evidence,
}: {
  evidence?: AiInsightEvidenceFragment[]
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [selectedPr, setSelectedPr] =
    useState<PullRequestEvidenceFragment | null>(null)

  const { logEvidence, prEvidence } = useMemo(() => {
    const logEvidence: LogsEvidenceFragment[] = []
    const prEvidence: PullRequestEvidenceFragment[] = []

    evidence?.forEach(({ type, logs, pullRequest: pr }) => {
      if (type === EvidenceType.Log && logs) logEvidence.push(logs)
      else if (type === EvidenceType.Pr && pr) prEvidence.push(pr)
    })
    return { logEvidence, prEvidence }
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

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
})
