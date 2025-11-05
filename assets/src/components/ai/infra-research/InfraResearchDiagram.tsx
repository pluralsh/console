import {
  Button,
  Code,
  EmptyState,
  MagicWandIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useFixResearchDiagramMutation } from 'generated/graphql'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { InfraResearchContextType } from './InfraResearch'

export function InfraResearchDiagram() {
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  const diagram = infraResearch?.diagram

  const [parseError, setParseError] = useState<Nullable<Error>>(
    () => parseErrorCache[infraResearch?.diagram ?? '']
  )
  const [fixResearchDiagram, { loading: fixLoading, error: fixError }] =
    useFixResearchDiagramMutation()

  if (!diagram) return <EmptyState message="No diagram found." />

  return (
    <WrapperSC>
      <StretchedFlex>
        <Subtitle1H1>Diagram</Subtitle1H1>
        {parseError && (
          <Button
            loading={fixLoading}
            endIcon={<MagicWandIcon />}
            onClick={() =>
              fixResearchDiagram({
                variables: { id: infraResearch.id, error: parseError.message },
              })
            }
          >
            Fix parse errors
          </Button>
        )}
      </StretchedFlex>
      {fixError && <GqlError error={fixError} />}
      {parseError && <GqlError error={parseError} />}
      {diagram && (
        <Code
          key={diagram}
          showHeader={false}
          language="mermaid"
          setMermaidError={(error) => {
            parseErrorCache[diagram] = error
            setParseError(error)
          }}
          css={{ overflow: 'clip' }}
        >
          {diagram}
        </Code>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

// need to fix this in the ds so errors don't get cleared away after first render
const parseErrorCache: Record<string, Nullable<Error>> = {}
