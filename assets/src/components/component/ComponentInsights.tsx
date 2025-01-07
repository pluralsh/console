import { Flex } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { useOutletContext } from 'react-router-dom'
import { dateTimeFormat } from 'utils/date'
import { AiInsight } from '../../generated/graphql.ts'
import AIPinButton from '../ai/AIPinButton.tsx'
import { AISuggestFix } from '../ai/chatbot/AISuggestFix.tsx'
import {
  ChatWithAIButton,
  insightMessage,
} from '../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../utils/RefreshIconFrame.tsx'
import { ComponentDetailsContext } from './ComponentDetails.tsx'
import { InsightDisplay } from '../ai/InsightDisplay.tsx'

export function ComponentInsights() {
  const { component, refetch, loading } =
    useOutletContext<ComponentDetailsContext>()

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      maxHeight="100%"
      height="100%"
    >
      <Flex
        align="center"
        justify="flex-end"
        gap="small"
      >
        <CaptionP
          css={{ width: 'max-content' }}
          $color="text-xlight"
        >
          {component.insight?.updatedAt &&
            `Last updated at ${dateTimeFormat(component.insight?.updatedAt)}`}
        </CaptionP>
        <IconFrameRefreshButton
          loading={loading}
          refetch={refetch}
        />
        <AIPinButton insight={component?.insight as AiInsight} />
        <ChatWithAIButton
          floating
          insightId={component?.insight?.id}
          messages={[insightMessage(component?.insight)]}
        />
        <AISuggestFix insight={component?.insight} />
      </Flex>
      <InsightDisplay
        text={component.insight?.text}
        kind={component.kind}
      />
    </Flex>
  )
}
