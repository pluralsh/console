import { Mermaid } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useInfraResearchQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'
import { AI_INFRA_RESEARCH_PARAM_ID } from 'routes/aiRoutesConsts'
import styled from 'styled-components'

export function InfraResearch() {
  const id = useParams()[AI_INFRA_RESEARCH_PARAM_ID] ?? ''
  const { data } = useInfraResearchQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  console.log(data)
  return (
    <WrapperSC>
      {data?.infraResearch?.diagram && (
        <>
          <Subtitle1H1>Diagram</Subtitle1H1>
          <Mermaid ref={null}>{data?.infraResearch?.diagram}</Mermaid>
        </>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
}))
