import {
  Button,
  Code,
  EmptyState,
  Flex,
  LinkoutIcon,
  MagicWandIcon,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  useCreateInfraResearchMutation,
  useFixResearchDiagramMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  AI_THREADS_REL_PATH,
  getInfraResearchAbsPath,
} from 'routes/aiRoutesConsts'
import styled from 'styled-components'
import { PanZoomWrapper } from '../../utils/PanZoomWrapper'
import { InfraResearchContextType } from './InfraResearch'

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
    variables: { attributes: { prompt: infraResearch?.prompt || '' } },
  })

  if (!diagram) return <EmptyState message="No diagram found." />

  return (
    <WrapperSC>
      <Flex
        gap="small"
        justify="flex-end"
      >
        <WrapWithIf
          wrapper={
            <Tooltip
              placement="top"
              label="Kick off a new research run with the same prompt"
            />
          }
          condition={!createData}
        >
          <Button
            secondary
            loading={createLoading}
            {...(createData
              ? {
                  to: getInfraResearchAbsPath({
                    infraResearchId: createData?.createInfraResearch?.id,
                    tab: AI_THREADS_REL_PATH,
                  }),
                  as: Link,
                  endIcon: <LinkoutIcon />,
                }
              : { onClick: () => createInfraResearch() })}
          >
            {createData ? 'Go to new research' : 'Try again'}
          </Button>
        </WrapWithIf>
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
      </Flex>
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
            css={{ minHeight: 0 }}
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
