import { getInsightPathInfo } from 'components/ai/AITableEntry'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { FlowInsightFragment } from 'generated/graphql'
import styled from 'styled-components'

export function FlowInsightIcon({
  insight,
}: {
  insight: Nullable<FlowInsightFragment>
}) {
  const url = getInsightPathInfo(insight)?.url

  return (
    <InsightIconSC>
      <AiInsightSummaryIcon
        noPadding
        insight={insight}
        navPath={url ? `${url}/insights` : undefined}
      />
    </InsightIconSC>
  )
}

const InsightIconSC = styled.span({
  display: 'inline-flex',
  lineHeight: 0,
  '& svg': { width: 13, height: 13 },
})
