import { useTheme } from 'styled-components'
import {
  Chip,
  ChipProps,
  MagicWandIcon,
  MinusIcon,
  PlusIcon,
} from '@pluralsh/design-system'
import { Dispatch, SetStateAction, useRef, useState } from 'react'
import chroma from 'chroma-js'
import prompts from './prompts.json'
import { useClickOutside } from '@react-hooks-library/core'

const PROMPTS_LIMIT = 3

function Prompt({ children, ...props }: ChipProps) {
  const theme = useTheme()

  return (
    <Chip
      size="large"
      clickable
      css={{
        borderRadius: 16,
        padding: theme.spacing.large,
        width: 'fit-content',
      }}
      {...props}
    >
      <MagicWandIcon size={12} />
      <span
        css={{
          ...theme.partials.text.body2,
          marginLeft: theme.spacing.xxsmall,
        }}
      >
        {children}
      </span>
    </Chip>
  )
}

function PromptsControl({
  showAll,
  setShowAll,
}: {
  showAll: boolean
  setShowAll: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()

  return (
    <Chip
      css={{
        borderRadius: 16,
        cursor: 'pointer',
        height: 32,
        backgroundColor: chroma(theme.colors['fill-one']).alpha(0.5).hex(),

        '&:hover': {
          backgroundColor: chroma(theme.colors['fill-one-hover'])
            .alpha(0.5)
            .hex(),

          '.children': {
            color: theme.colors['text-light'],
          },
        },

        '&:not(:hover) .children': {
          color: theme.colors['text-xlight'],
        },
      }}
      onClick={() => setShowAll(!showAll)}
      width="max-content"
    >
      {showAll ? <MinusIcon size={12} /> : <PlusIcon size={12} />}
      <span
        css={{
          ...theme.partials.text.body2,
          marginLeft: theme.spacing.xxsmall,
        }}
      >
        {showAll ? 'Show less' : 'Show all prompts'}
      </span>
    </Chip>
  )
}

export function ChatbotPanelExamplePrompts({
  setShowPrompts,
  sendMessage,
}: {
  setShowPrompts: Dispatch<SetStateAction<boolean>>
  sendMessage: (newMessage: string) => void
}) {
  const theme = useTheme()
  const hasMorePrompts = prompts.length > PROMPTS_LIMIT
  const [showAll, setShowAll] = useState(!hasMorePrompts)
  const ref = useRef<any>(null)

  useClickOutside(ref, () => setShowPrompts(false))

  return (
    <div
      css={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        maxHeight: '100%',
        width: '100%',
        overflow: 'hidden auto',
        zIndex: 1,
      }}
    >
      <div
        css={{
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${chroma(theme.colors['border-fill-two']).alpha(0.1).hex()}`,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
            padding: theme.spacing.medium,
            width: '100%',
            overflow: 'hidden',
          }}
          ref={ref}
        >
          {(showAll ? prompts : prompts.slice(0, PROMPTS_LIMIT)).map((p, i) => (
            <Prompt
              key={i}
              onClick={() => {
                sendMessage(p)
                setShowPrompts(false)
              }}
            >
              {p}
            </Prompt>
          ))}
          {hasMorePrompts && (
            <PromptsControl
              showAll={showAll}
              setShowAll={setShowAll}
            />
          )}
        </div>
      </div>
    </div>
  )
}
