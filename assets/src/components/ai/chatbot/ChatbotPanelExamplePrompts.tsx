import { useTheme } from 'styled-components'
import { Chip, MagicWandIcon } from '@pluralsh/design-system'

function Prompt({ children }: { children: React.ReactNode }) {
  const theme = useTheme()

  return (
    <Chip
      clickable
      css={{
        borderRadius: 16,
        height: 32,
      }}
    >
      <MagicWandIcon
        size={12}
        marginRight={theme.spacing.xxsmall}
      />
      <span css={{ ...theme.partials.text.body2 }}>{children}</span>
    </Chip>
  )
}

export function ChatbotPanelExamplePrompts() {
  const theme = useTheme()
  const prompts = [
    'Give me the details of the deployment resource.',
    'Query the error logs on the prod cluster.',
    'What are all the components of the prod clusters service?',
    'Give me the details of the deployment resource.',
    'Query the error logs on the prod cluster.',
    'What are all the components of the prod clusters service?',
  ] // TODO

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
      }}
    >
      <div
        css={{
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
          padding: theme.spacing.medium,
        }}
      >
        {prompts.map((p, i) => (
          <Prompt key={i}>{p}</Prompt>
        ))}
      </div>
    </div>
  )
}
