import { Divider, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import { InfraResearchFragment, useInfraResearchQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo } from 'react'
import { useMatch } from 'react-router-dom'
import {
  AI_INFRA_RESEARCH_ABS_PATH,
  AI_INFRA_RESEARCH_PARAM_ID,
  getInfraResearchAbsPath,
} from 'routes/aiRoutesConsts'
import styled from 'styled-components'
import { getInfraResearchesBreadcrumbs } from '../InfraResearches'
import { InfraResearchSidecar } from './InfraResearchSidecar'

function getBreadcrumbs(infraResearch: Nullable<InfraResearchFragment>) {
  return [
    ...getInfraResearchesBreadcrumbs(),
    {
      label: truncate(infraResearch?.prompt ?? '', { length: 30 }),
      url: getInfraResearchAbsPath({ infraResearchId: infraResearch?.id }),
    },
  ]
}

export type InfraResearchContextType = {
  infraResearch: Nullable<InfraResearchFragment>
}

export function InfraResearch() {
  const { researchId = '' } =
    useMatch(`${AI_INFRA_RESEARCH_ABS_PATH}/:${AI_INFRA_RESEARCH_PARAM_ID}/*`)
      ?.params ?? {}

  const { data, loading, error } = useInfraResearchQuery({
    variables: { id: researchId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const infraResearch = data?.infraResearch

  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(infraResearch), [infraResearch])
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <MainContentSC>
      <Flex
        direction="column"
        gap="large"
        flex={1}
        minWidth={0}
      >
        <StretchedFlex>
          <StackedText
            first="Prompt"
            firstPartialType="subtitle1"
            firstColor="text"
            second={infraResearch?.prompt}
            secondPartialType="body2"
            secondColor="text-xlight"
          />
        </StretchedFlex>
        <Divider backgroundColor="border" />
        <Body2BoldP $color="text">Diagram</Body2BoldP>
        <Body2BoldP $color="text">Analysis</Body2BoldP>
      </Flex>
      <ResponsiveLayoutSidecarContainer css={{ width: 300 }}>
        <InfraResearchSidecar
          infraResearch={infraResearch}
          loading={loading}
        />
      </ResponsiveLayoutSidecarContainer>
    </MainContentSC>
  )
}

const MainContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  width: '100%',
  height: '100%',
  minHeight: 0,
}))
