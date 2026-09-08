import styled, { useTheme } from 'styled-components'

import { WrapWithIf } from '@pluralsh/design-system'

const Key = styled.kbd(({ theme }) => ({
  ...theme.partials.text.caption,
  backgroundColor: theme.colors['fill-three'],
  border: theme.borders['fill-three'],
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing.xxsmall,
  borderRadius: '4px',
  height: 20,
  minWidth: 20,
}))

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
          key={i}
          condition={!['or', 'then'].includes(chunk.toLowerCase())}
          wrapper={<Key key={i} />}
        >
          {chunk}
        </WrapWithIf>
      ))}
    </div>
  )
}
