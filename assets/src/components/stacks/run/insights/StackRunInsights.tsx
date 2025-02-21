import { Flex } from '@pluralsh/design-system'

import { CaptionP } from 'components/utils/typography/Text'
import { formatDateTime, fromNow } from 'utils/datetime'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { AiInsight } from '../../../../generated/graphql.ts'
import AIPinButton from '../../../ai/AIPinButton.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { StackRunOutletContextT } from '../Route.tsx'
import { InsightDisplay } from '../../../ai/insights/InsightDisplay.tsx'

export function StackRunInsights() {
  const theme = useTheme()
  const { stackRun, refetch, loading } =
    useOutletContext<StackRunOutletContextT>()

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      height="100%"
    >
      <Flex
        justify="space-between"
        alignItems="center"
      >
        <StackedText
          first="Insight"
          firstPartialType="body1Bold"
          second={
            stackRun.insight?.updatedAt &&
            `Last updated ${fromNow(stackRun.insight?.updatedAt)}`
          }
        />
        <Flex
          align="center"
          justify="flex-end"
          gap="small"
          paddingLeft={theme.spacing.medium}
        >
          <CaptionP
            css={{ width: 'max-content' }}
            $color="text-xlight"
          >
            {stackRun.insight?.updatedAt &&
              `Last updated ${formatDateTime(stackRun?.insight?.updatedAt)}`}
          </CaptionP>
          <IconFrameRefreshButton
            loading={loading}
            refetch={refetch}
          />
          <AIPinButton insight={stackRun?.insight as AiInsight} />
          <ChatWithAIButton
            floating
            insightId={stackRun?.insight?.id}
            messages={[insightMessage(stackRun?.insight)]}
          />
          {/* TODO: Enable once API forbidden error is fixed */}
          {/* <AISuggestFix insight={stackRun?.insight} /> */}
        </Flex>
      </Flex>
      <InsightDisplay
        insight={stackRun?.insight}
        kind="stack run"
      />
    </Flex>
  )
}
