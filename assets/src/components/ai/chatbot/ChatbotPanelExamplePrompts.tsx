import { useTheme } from 'styled-components'
import {
  CaretDownIcon,
  Chip,
  ChipProps,
  MagicWandIcon,
  PlusIcon,
} from '@pluralsh/design-system'
import { Dispatch, SetStateAction, useState } from 'react'
import chroma from 'chroma-js'
import { isEmpty } from 'lodash'

const PROMPTS_LIMIT = 3

function Prompt({ children, ...props }: ChipProps) {
  const theme = useTheme()

  return (
    <Chip
      clickable
      props={props}
      css={{
        borderRadius: 16,
        height: 32,
      }}
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
      onClick={() => setShowAll(!showAll)}
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
    >
      {/* TODO: Add minus icon. */}
      {showAll ? <CaretDownIcon size={12} /> : <PlusIcon size={12} />}
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

export function ChatbotPanelExamplePrompts() {
  const prompts = [
    'Give me the details of the deployment resource.',
    'Query the error logs on the prod cluster.',
    'What are all the components of the prod clusters service?',
    'Give me the details of the deployment resource.',
    'Query the error logs on the prod cluster.',
    'What are all the components of the prod clusters service?',
  ] // TODO: Replace with real data.

  const theme = useTheme()
  const hasMorePrompts = prompts.length > PROMPTS_LIMIT
  const [showAll, setShowAll] = useState(!hasMorePrompts)

  if (isEmpty(prompts)) return null

  return (
    <div
      css={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflowY: 'auto',
        zIndex: 1,
      }}
    >
      <div
        css={{
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${chroma(theme.colors['border-fill-two']).alpha(0.1).hex()}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
          padding: theme.spacing.medium,
        }}
      >
        {(showAll ? prompts : prompts.slice(0, PROMPTS_LIMIT)).map((p, i) => (
          <Prompt key={i}>{p}</Prompt>
        ))}
        {hasMorePrompts && (
          <PromptsControl
            showAll={showAll}
            setShowAll={setShowAll}
          />
        )}
      </div>
    </div>
  )
}
