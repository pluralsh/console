import { Mermaid, useSetBreadcrumbs } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useInfraResearchQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  AI_INFRA_RESEARCH_ABS_PATH,
  AI_INFRA_RESEARCH_PARAM_ID,
} from 'routes/aiRoutesConsts'
import styled from 'styled-components'
import { getInfraResearchesBreadcrumbs } from './InfraResearches'
import { truncate } from 'lodash'

export function InfraResearch() {
  const id = useParams()[AI_INFRA_RESEARCH_PARAM_ID] ?? ''

  const { data } = useInfraResearchQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getInfraResearchesBreadcrumbs(),
        {
          label: truncate(data?.infraResearch?.prompt ?? '', { length: 30 }),
          href: `${AI_INFRA_RESEARCH_ABS_PATH}/${id}`,
        },
      ],
      [data?.infraResearch?.prompt, id]
    )
  )

  return (
    <WrapperSC>
      {data?.infraResearch?.diagram && (
        <>
          <Subtitle1H1>Diagram</Subtitle1H1>
          <Mermaid diagram={data?.infraResearch?.diagram} />
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
