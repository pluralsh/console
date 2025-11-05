import {
  Button,
  Code,
  EmptyState,
  Flex,
  MagicWandIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import CopyButton from 'components/utils/CopyButton'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useFixResearchDiagramMutation } from 'generated/graphql'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { InfraResearchContextType } from './InfraResearch'

export function InfraResearchDiagram() {
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  const [parseError, setParseError] = useState<Nullable<Error>>(null)
  const [fixResearchDiagram, { loading: fixLoading, error: fixError }] =
    useFixResearchDiagramMutation()
  // clear parse error if diagram changes
  useEffect(() => {
    setParseError(null)
  }, [infraResearch?.diagram])

  if (!infraResearch?.diagram) return <EmptyState message="No diagram found." />

  return (
    <WrapperSC>
      <StretchedFlex>
        <Flex
          align="center"
          gap="xsmall"
        >
          <Subtitle1H1>Diagram</Subtitle1H1>
          <CopyButton
            type="tertiary"
            text={infraResearch.diagram}
            tooltip="Copy Mermaid text to clipboard"
          />
        </Flex>
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

      {infraResearch.diagram && (
        <Code
          language="mermaid"
          setMermaidError={setParseError}
        >
          {infraResearch.diagram}
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
