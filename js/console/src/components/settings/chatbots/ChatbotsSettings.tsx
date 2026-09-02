import {
  ArrowTopRightIcon,
  Breadcrumb,
  Flex,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../Settings'
import { CHATBOTS_SETTINGS_ABS_PATH } from '../../../routes/settingsRoutesConst'
import { StackedTextSC } from '../../utils/table/StackedText'
import { AddChatbotButton, ChatbotsList } from './ChatbotsList'

const CHATBOTS_SETTINGS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'chatbots', url: CHATBOTS_SETTINGS_ABS_PATH },
]

export default function ChatbotsSettings() {
  const theme = useTheme()

  useSetBreadcrumbs(CHATBOTS_SETTINGS_BREADCRUMBS)
  useSetPageHeaderContent(
    <Flex justifyContent="space-between">
      <StackedTextSC>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          Manage all your chatbot integrations and settings here. Use them
          within workbenches to trigger jobs from chat.
        </span>
      </StackedTextSC>
      <AddChatbotButton
        buttonProps={{
          secondary: true,
          endIcon: <ArrowTopRightIcon />,
        }}
      />
    </Flex>
  )

  return <ChatbotsList />
}
