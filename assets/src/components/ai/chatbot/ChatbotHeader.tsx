import {
  ChatOutlineIcon,
  ExpandIcon,
  Flex,
  GearTrainIcon,
  HistoryIcon,
  IconFrame,
  ShrinkIcon,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import { AiInsightFragment, ChatThreadTinyFragment } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../AIContext'
import AIPinButton from '../AIPinButton'
import { ChatWithAIButton, insightMessage } from './ChatbotButton'

export function ChatbotHeader({
  onClose,
  fullscreen,
  currentThread,
  currentInsight,
}: {
  onClose: () => void
  fullscreen: boolean
  currentThread?: Nullable<ChatThreadTinyFragment>
  currentInsight?: Nullable<AiInsightFragment>
}) {
  const insight = currentThread?.insight || currentInsight
  const title = currentThread?.summary || (!!insight ? 'Insight' : 'Plural AI')
  const subtitle =
    insight?.updatedAt && !currentThread
      ? `Last updated ${dayjs(insight.updatedAt).fromNow()}`
      : 'AI is prone to mistakes, always test changes before application.'
  return fullscreen ? (
    <ChatbotHeaderFullscreen
      insight={insight}
      thread={currentThread}
      title={title}
      subtitle={subtitle}
    />
  ) : (
    <ChatbotHeaderRegular
      onClose={onClose}
      title={title}
      subtitle={subtitle}
    />
  )
}

function ChatbotHeaderRegular({
  onClose,
  title,
  subtitle,
}: {
  onClose: () => void
  title: string
  subtitle: string
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { goToThreadList, setFullscreen } = useChatbot()
  return (
    <ChatbotHeaderRegularSC>
      <Flex
        gap="xsmall"
        align="center"
      >
        <ChatOutlineIcon color={theme.colors['icon-primary']} />
        <Body2BoldP css={{ flex: 1 }}>{title}</Body2BoldP>
        <IconFrame
          clickable
          tooltip="See history"
          onClick={goToThreadList}
          size="small"
          icon={<HistoryIcon />}
        />
        <IconFrame
          clickable
          tooltip="Go to settings"
          onClick={() => {
            onClose()
            navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)
          }}
          size="small"
          icon={<GearTrainIcon />}
        />
        <IconFrame
          clickable
          tooltip="Expand view"
          onClick={() => setFullscreen(true)}
          size="small"
          icon={<ExpandIcon />}
        />
        <IconFrame
          clickable
          tooltip="Close"
          size="small"
          icon={LineIcon}
          onClick={onClose}
        />
      </Flex>
      <CaptionP $color="text-xlight">{subtitle}</CaptionP>
    </ChatbotHeaderRegularSC>
  )
}

function ChatbotHeaderFullscreen({
  insight,
  thread,
  title,
  subtitle,
}: {
  insight?: Nullable<AiInsightFragment>
  thread?: Nullable<ChatThreadTinyFragment>
  title: string
  subtitle: string
}) {
  const { setFullscreen } = useChatbot()

  return (
    <ChatbotHeaderFullscreenSC>
      <StackedText
        css={{ flex: 1 }}
        first={title}
        firstPartialType="body1Bold"
        second={subtitle}
      />
      <AIPinButton
        insight={insight}
        thread={thread}
      />
      <IconFrame
        tooltip="Collapse view"
        type="secondary"
        size="large"
        clickable
        icon={<ShrinkIcon css={{ width: 16 }} />}
        onClick={() => setFullscreen(false)}
      />
      {!thread && insight && (
        <ChatWithAIButton
          insightId={insight.id}
          messages={[insightMessage(insight)]}
          bodyText="Chat about it"
        />
      )}
    </ChatbotHeaderFullscreenSC>
  )
}

const ChatbotHeaderRegularSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const ChatbotHeaderFullscreenSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: theme.spacing.medium,
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-one'],
}))

const LineIcon = (
  <svg
    width="16"
    height="2"
  >
    <path
      d="M1 1H15"
      stroke="#F1F3F3"
      strokeWidth="1.5"
    />
  </svg>
)
