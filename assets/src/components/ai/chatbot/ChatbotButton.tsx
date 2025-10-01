import {
  ArrowTopRightIcon,
  Button,
  ButtonProps,
  ChatOutlineIcon,
  IconFrame,
  Spinner,
} from '@pluralsh/design-system'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext.tsx'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ComponentPropsWithRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_ABS_PATH } from 'routes/aiRoutesConsts.tsx'
import styled from 'styled-components'
import { useChatbot } from '../AIContext.tsx'

const FIX_PREFACE =
  "The following is an insight into an issue on the user's infrastructure we'd like to learn more about:"

const ANIMATION_SPEED_S = 4
// run every 20 minutes for 6 seconds
const ANIMATION_ON_MS = 6_000
const ANIMATION_PERIOD_MS = 20 * 60 * 1000

export function MainChatbotButton({
  ...props
}: ComponentPropsWithRef<typeof Button>) {
  const showAnimation = usePeriodicPulse(ANIMATION_ON_MS, ANIMATION_PERIOD_MS)
  return (
    <MainChatbotButtonSC
      $showAnimation={showAnimation}
      small
      secondary
      startIcon={<ChatOutlineIcon size={12} />}
      {...props}
    >
      Chat
    </MainChatbotButtonSC>
  )
}

export function insightMessage(
  insight: Nullable<AiInsightFragment>
): ChatMessage {
  return {
    content: `${FIX_PREFACE}\n\n${insight?.text ?? ''}`,
    role: AiRole.Assistant,
  }
}

export function ChatWithAIButton({
  messages,
  insightId,
  flowId,
  summaryText = 'Further questions about an insight from Plural AI',
  bodyText: bodyTextProp = 'Chat with AI',
  iconOnly = false,
  ...props
}: {
  messages?: Nullable<ChatMessage[]>
  insightId?: Nullable<string>
  flowId?: Nullable<string>
  summaryText?: string
  bodyText?: string
  iconOnly?: boolean
} & ButtonProps) {
  const {
    createNewThread,
    mutationLoading: loading,
    closeChatbot,
  } = useChatbot()
  const aiEnabled = useAIEnabled()
  const bodyText = aiEnabled ? bodyTextProp : 'Enable AI to chat'

  const handleClick = () => {
    createNewThread({
      insightId,
      flowId,
      summary: summaryText,
      summarized: false,
      messages: messages || [],
    })
  }
  return iconOnly ? (
    <IconFrame
      clickable
      {...(aiEnabled
        ? {
            onClick: handleClick,
            icon: loading ? <Spinner /> : <ChatOutlineIcon />,
            to: '',
          }
        : {
            as: Link,
            to: AI_ABS_PATH,
            onClick: closeChatbot,
            icon: <ArrowTopRightIcon />,
          })}
      tooltip
      textValue={bodyText}
      {...props}
      type="secondary"
    />
  ) : (
    <Button
      loading={loading}
      {...(aiEnabled
        ? { onClick: handleClick, startIcon: <ChatOutlineIcon /> }
        : {
            as: Link,
            to: AI_ABS_PATH,
            onClick: closeChatbot,
            endIcon: <ArrowTopRightIcon />,
          })}
      {...props}
    >
      {bodyText}
    </Button>
  )
}

const MainChatbotButtonSC = styled(Button)<{ $showAnimation: boolean }>(
  ({ theme, $showAnimation }) => ({
    '&, &:hover, &:focus': {
      '@property --border-angle-1': {
        syntax: "'<angle>'",
        inherits: 'true',
        initialValue: '0deg',
      },
      '@property --border-angle-2': {
        syntax: "'<angle>'",
        inherits: 'true',
        initialValue: '180deg',
      },
      '--border-angle-1': '0deg',
      '--border-angle-2': '180deg',
      border: $showAnimation ? '1px solid transparent' : undefined,
      backgroundImage: `
        linear-gradient(${theme.colors['fill-accent']}, ${theme.colors['fill-accent']}),
        conic-gradient(
          from var(--border-angle-1) at 25% 30%,
          transparent,
          ${theme.colors['border-outline-focused']} 12%,
          transparent 32%,
          transparent
        ),
        conic-gradient(
          from var(--border-angle-2) at 75% 60%,
          transparent,
          ${theme.colors['border-input']} 12%,
          transparent 60%,
          transparent
        )
      `,
      backgroundClip: 'padding-box, border-box, border-box',
      backgroundOrigin: 'border-box',
      animation: `rotateChatBtnBorderA ${ANIMATION_SPEED_S}s linear infinite, rotateChatBtnBorderB ${ANIMATION_SPEED_S * 1.5}s linear infinite`,
      animationPlayState: $showAnimation ? 'running' : 'paused',
      '@keyframes rotateChatBtnBorderA': {
        to: { '--border-angle-1': '360deg' },
      },
      '@keyframes rotateChatBtnBorderB': {
        to: { '--border-angle-2': '-360deg' },
      },
    },
  })
)

function usePeriodicPulse(onMs: number, periodMs: number) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const trigger = () => {
      if (timeoutId) clearTimeout(timeoutId)
      setOn(true)
      timeoutId = setTimeout(() => setOn(false), onMs)
    }
    // summed so the timing starts at the end of the animation
    const intervalId = setInterval(trigger, periodMs + onMs)
    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [onMs, periodMs])
  return on
}
