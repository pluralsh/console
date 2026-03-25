import { Card } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { InfraResearchStatus, useInfraResearchQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cluster/constants.ts'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import {
  StepperAccordionItemSC,
  StepperAccordionSC,
} from 'components/utils/StepperAccordion'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import { Body1P } from 'components/utils/typography/Text.tsx'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInfraResearchAbsPath } from 'routes/aiRoutesConsts.tsx'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useChatbot } from '../AIContext.tsx'
import { MultiThreadViewerThreadMessages } from './multithread/MultiThreadViewerThreadMessages.tsx'
import { AI_GRADIENT_BG } from '../agent-runs/details/AIAgentRunMessages.tsx'

const THREAD_GAP = 'small'

export function ChatbotPanelInfraResearch() {
  const navigate = useNavigate()
  const { borders, borderRadiuses } = useTheme()
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
  const threadIdList = threads.map((thread) => thread.id)

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
    <GradientWrapperSC>
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
      <StepperAccordionSC
        type="multiple"
        $gap={THREAD_GAP}
        key={threadIdList.join('-')} // force re-render when threads change
        defaultValue={threadIdList}
      >
        {threads.map((thread) => (
          <StepperAccordionItemSC
            key={thread.id}
            value={thread.id}
            caret="right"
            padding="compact"
            paddingArea="trigger-only"
            $gap={THREAD_GAP}
            triggerWrapperStyles={{
              border: borders['fill-three'],
              borderRadius: borderRadiuses.large,
            }}
            trigger={
              <Body2P
                $color="text-light"
                css={TRUNCATE}
              >
                {thread.summary}
              </Body2P>
            }
          >
            <MultiThreadViewerThreadMessages
              thread={thread}
              isExpectingStream={isRunning}
            />
          </StepperAccordionItemSC>
        ))}
      </StepperAccordionSC>
    </GradientWrapperSC>
  )
}

const GradientWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  flexDirection: 'column',
  height: '100%',
  overflow: 'auto',
  padding: `${theme.spacing.medium}px ${theme.spacing.xxxlarge}px ${theme.spacing.xlarge}px`,
  background: AI_GRADIENT_BG,
}))

const PromptCardSC = styled(Card)(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))
