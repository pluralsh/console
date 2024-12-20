import { Flex } from '@pluralsh/design-system'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import moment from 'moment'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { dateTimeFormat } from 'utils/date'
import { AiInsight } from '../../../../generated/graphql.ts'
import AIPinButton from '../../../ai/AIPinButton.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../../../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../../../utils/RefreshIconFrame.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { StackRunOutletContextT } from '../Route.tsx'

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
            `Last updated ${moment(stackRun.insight?.updatedAt).fromNow()}`
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
              `Last updated ${dateTimeFormat(stackRun?.insight?.updatedAt)}`}
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
      <InsightDisplay text={stackRun.insight?.text} />
    </Flex>
  )
}
