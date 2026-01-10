import { Card } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { InfraResearchStatus, useInfraResearchQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cluster/constants.ts'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import styled from 'styled-components'
import { useChatbot } from '../AIContext.tsx'
import { Body1P } from 'components/utils/typography/Text.tsx'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { ChatbotMultiThreadViewer } from './multithread/ChatbotMultiThreadViewer.tsx'
import { useNavigate } from 'react-router-dom'
import { getInfraResearchAbsPath } from 'routes/aiRoutesConsts.tsx'
import { useMemo } from 'react'

export function ChatbotPanelInfraResearch() {
  const navigate = useNavigate()
  const { currentResearchId } = useChatbot()

  const { data, loading, error } = useInfraResearchQuery({
    variables: { id: currentResearchId ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const infraResearch = data?.infraResearch
  const threads = useMemo(
    () => data?.infraResearch?.threads?.filter(isNonNullable) ?? [],
    [data]
  )

  const isLoading = !data && loading
  const isRunning = infraResearch?.status === InfraResearchStatus.Running

  if (error)
    return (
      <GqlError
        error={error}
        margin="medium"
      />
    )

  return (
    <WrapperSC>
      {isLoading ? (
        <RectangleSkeleton
          $width="100%"
          $height="xxlarge"
        />
      ) : (
        <PromptCardSC
          clickable
          onClick={() =>
            navigate(
              getInfraResearchAbsPath({
                infraResearchId: currentResearchId ?? '',
              })
            )
          }
        >
          {infraResearch?.prompt}
        </PromptCardSC>
      )}
      {infraResearch?.status === InfraResearchStatus.Running && (
        <Body1P $shimmer>
          This will only take a few minutes. Feel free to leave while the agent
          runs in the background. You can return to this by clicking “View
          progress”.
        </Body1P>
      )}
      <ChatbotMultiThreadViewer
        threads={threads}
        isExpectingStream={isRunning}
      />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  flexDirection: 'column',
  height: '100%',
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.xxxlarge}px ${theme.spacing.xlarge}px`,
  background: `linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, rgba(74, 81, 242, 0.13) 100%)`,
}))

const PromptCardSC = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))
