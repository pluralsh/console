import { AccordionItem, BotIcon, Flex, Prop } from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  TriggerAccordionSC,
  TriggerCardIconWrapperSC,
  TriggerCardSC,
  TriggerPropsRowSC,
} from 'components/workbenches/common/WorkbenchTriggerCard'
import { WorkbenchJobFragment } from 'generated/graphql'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from '../chatbots/utils'

export function WorkbenchJobTriggerChatbot({
  job,
}: {
  job?: Nullable<WorkbenchJobFragment>
}) {
  const chatbotMessage = job?.chatbotMessage
  if (!chatbotMessage) return null

  const chatConnection = chatbotMessage.chatConnection

  return (
    <TriggerCardSC>
      <TriggerAccordionSC
        type="multiple"
        defaultValue={['chatbot-details']}
      >
        <AccordionItem
          value="chatbot-details"
          padding="none"
          caret="right-quarter"
          trigger={
            <Flex
              align="center"
              gap="medium"
            >
              <TriggerCardIconWrapperSC>
                <BotIcon />
              </TriggerCardIconWrapperSC>
              <Body2BoldP $color="text-light">Chatbot</Body2BoldP>
            </Flex>
          }
        >
          <TriggerContentSC
            direction="column"
            gap="medium"
          >
            <Flex
              direction="column"
              gap="xxsmall"
            >
              <Body2BoldP $color="text-light">
                {chatbotMessage.channel ?? 'Unknown channel'}
              </Body2BoldP>
              {chatbotMessage.message && (
                <CaptionP $color="text-xlight">
                  {chatbotMessage.message}
                </CaptionP>
              )}
            </Flex>
            <TriggerPropsRowSC>
              {job?.insertedAt && (
                <Prop
                  title="Date"
                  margin={0}
                >
                  {formatDateTime(job.insertedAt, 'M/D/YYYY h:mma')}
                </Prop>
              )}
              {job?.user?.name && (
                <Prop
                  title="Creator"
                  margin={0}
                >
                  {job.user.name}
                </Prop>
              )}
              <Prop
                title="Provider"
                margin={0}
              >
                <Flex
                  align="center"
                  gap="xsmall"
                >
                  {chatProviderConnectionIcon(chatConnection?.type)}
                  {chatProviderConnectionLabel(chatConnection?.type)}
                </Flex>
              </Prop>
            </TriggerPropsRowSC>
          </TriggerContentSC>
        </AccordionItem>
      </TriggerAccordionSC>
    </TriggerCardSC>
  )
}

const TriggerContentSC = styled(Flex)(({ theme }) => ({
  marginTop: theme.spacing.small,
}))
