import { useTheme } from 'styled-components'

import { WrapWithIf } from '@pluralsh/design-system'

export default function CommandPaletteShortcuts({
  shortcuts,
}: {
  shortcuts?: string[]
}) {
  const theme = useTheme()

  if (!shortcuts) return null

  const chunks = shortcuts?.join(' or ').split(' ')

  return (
    <div
      css={{
        alignItems: 'center',
        display: 'flex',
        gap: theme.spacing.xxsmall,
      }}
    >
      {chunks.map((chunk, i) => (
        <WrapWithIf
          condition={!['or', 'then'].includes(chunk.toLowerCase())}
          wrapper={
            <span
              key={i}
              style={{
                ...theme.partials.text.caption,
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
                padding: theme.spacing.xxsmall,
                backgroundColor: theme.colors['fill-two'], // TODO
                border: theme.borders['fill-two'],
                borderRadius: '4px',
                height: 20,
                minWidth: 20,
              }}
            />
          }
        >
          {chunk}
        </WrapWithIf>
      ))}
    </div>
  )
}
