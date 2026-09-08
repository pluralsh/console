import { Code, EmptyState } from '@pluralsh/design-system'
import styled from 'styled-components'

export function InfraResearchDiagram({
  diagram,
  setParseError,
}: {
  diagram: Nullable<string>
  setParseError: (error: Nullable<Error>) => void
}) {
  if (!diagram) return <EmptyState message="No diagram found." />

  return (
    <WrapperSC>
      <Code
        key={diagram}
        showHeader={false}
        language="mermaid"
        setMermaidError={setParseError}
        css={{ minHeight: 0, overflow: 'hidden', height: '100%' }}
      >
        {diagram}
      </Code>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  maxHeight: 450,
}))
