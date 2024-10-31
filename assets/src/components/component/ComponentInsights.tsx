import { Flex } from '@pluralsh/design-system'
import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import { CaptionP } from 'components/utils/typography/Text'
import { useOutletContext } from 'react-router-dom'
import { dateTimeFormat } from 'utils/date'
import { AISuggestFix } from '../ai/AISuggestFix.tsx'
import { ChatWithAIButton } from '../ai/chatbot/ChatbotButton.tsx'
import IconFrameRefreshButton from '../utils/RefreshIconFrame.tsx'
import { ComponentDetailsContext } from './ComponentDetails.tsx'

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
        <ChatWithAIButton
          floating
          insight={component?.insight}
        />
        <AISuggestFix insight={component?.insight} />
      </Flex>
      <InsightDisplay text={component.insight?.text} />
    </Flex>
  )
}
