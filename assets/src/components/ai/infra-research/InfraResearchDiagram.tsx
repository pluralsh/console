import {
  Button,
  ButtonProps,
  Code,
  EmptyState,
  LinkoutIcon,
  MagicWandIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import {
  useCreateInfraResearchMutation,
  useFixResearchDiagramMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { PanZoomWrapper } from '../../utils/PanZoomWrapper'
import { InfraResearchContextType } from './InfraResearch'
import { AI_INFRA_RESEARCH_ABS_PATH } from 'routes/aiRoutesConsts'

export function InfraResearchDiagram() {
  const { infraResearch } = useOutletContext<InfraResearchContextType>()
  const diagram = infraResearch?.diagram

  const [parseError, setParseError] = useState<Nullable<Error>>(
    () => parseErrorCache[infraResearch?.diagram ?? '']
  )
  const [fixResearchDiagram, { loading: fixLoading, error: fixError }] =
    useFixResearchDiagramMutation()

  const [
    createInfraResearch,
    { data: createData, loading: createLoading, error: createError },
  ] = useCreateInfraResearchMutation({
    variables: {
      attributes: {
        prompt: infraResearch?.prompt || '',
      },
    },
  })

  const newButtonAttrs: ButtonProps = createData
    ? {
        href: `${AI_INFRA_RESEARCH_ABS_PATH}/${createData?.createInfraResearch?.id}`,
        as: 'a' as const,
        target: '_blank',
        endIcon: <LinkoutIcon />,
      }
    : {}

  if (!diagram) return <EmptyState message="No diagram found." />

  return (
    <WrapperSC>
      <StretchedFlex>
        <Button
          secondary
          loading={createLoading}
          onClick={() => createInfraResearch()}
          {...newButtonAttrs}
        >
          {createData ? 'Go to new research' : 'Try again'}
        </Button>
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
      {createError && <GqlError error={createError} />}
      {diagram && (
        <WrapWithIf
          condition={!parseError}
          wrapper={<PanZoomWrapper />}
        >
          <Code
            key={diagram}
            showHeader={false}
            language="mermaid"
            setMermaidError={(error) => {
              parseErrorCache[diagram] = error
              setParseError(error)
            }}
          >
            {diagram}
          </Code>
        </WrapWithIf>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  minHeight: 0,
}))

// need to fix this in the ds so errors don't get cleared away after first render
const parseErrorCache: Record<string, Nullable<Error>> = {}
