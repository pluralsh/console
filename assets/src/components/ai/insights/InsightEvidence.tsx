import { LogsIcon, PrOpenIcon, Tab, TabList } from '@pluralsh/design-system'
import { AiInsightEvidenceFragment, EvidenceType } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { useRef, useState } from 'react'
import { isEmpty } from 'lodash'
import { LogsEvidencePanel } from './LogsEvidencePanel'
import { PrEvidencePanel } from './PrEvidencePanel'
import { isNonNullable } from 'utils/isNonNullable'

export function InsightEvidence({
  evidence,
}: {
  evidence?: AiInsightEvidenceFragment[]
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)

  const logEvidence = evidence
    ?.filter((item) => item.type === EvidenceType.Log)
    .map((item) => item.logs)
    .filter(isNonNullable)

  // TODO: Add PR evidence when backend supports
  // const prEvidence = evidence?.filter((item) => item.type === EvidenceType.Pr)
  const prEvidence = []

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
        <LogsEvidencePanel logs={logEvidence ?? []} />
      ) : (
        <PrEvidencePanel />
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
})
