import {
  AiSparkleFilledIcon,
  Button,
  Chip,
  ChipSeverity,
  Divider,
  EmptyState,
  Flex,
  SpinnerAlt,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body1P, Body2BoldP } from 'components/utils/typography/Text'
import {
  InfraResearchFragment,
  InfraResearchStatus,
  useFixResearchDiagramMutation,
  useInfraResearchQuery,
} from 'generated/graphql'
import { capitalize, truncate } from 'lodash'
import { useMemo, useState } from 'react'
import { useMatch } from 'react-router-dom'
import {
  AI_INFRA_RESEARCH_ABS_PATH,
  AI_INFRA_RESEARCH_PARAM_ID,
  getInfraResearchAbsPath,
} from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { getInfraResearchesBreadcrumbs } from '../InfraResearches'
import { InfraResearchAnalysis } from './InfraResearchAnalysis'
import { InfraResearchDiagram } from './InfraResearchDiagram'
import { InfraResearchSidecar } from './InfraResearchSidecar'
import { useChatbot } from 'components/ai/AIContext'

function getBreadcrumbs(infraResearch: Nullable<InfraResearchFragment>) {
  return [
    ...getInfraResearchesBreadcrumbs(),
    {
      label: truncate(infraResearch?.prompt ?? '', { length: 30 }),
      url: getInfraResearchAbsPath({ infraResearchId: infraResearch?.id }),
    },
  ]
}

export function InfraResearch() {
  const { spacing } = useTheme()
  const { createNewThread, mutationLoading: createThreadLoading } = useChatbot()
  const { researchId = '' } =
    useMatch(`${AI_INFRA_RESEARCH_ABS_PATH}/:${AI_INFRA_RESEARCH_PARAM_ID}/*`)
      ?.params ?? {}

  const [parseError, setParseError] = useState<Nullable<Error>>(null)

  const [fixResearchDiagram, { loading: fixLoading, error: fixError }] =
    useFixResearchDiagramMutation()

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

  if (!(infraResearch || loading))
    return <EmptyState message="Infra research not found." />

  const { id, status, analysis, diagram } = infraResearch ?? {}
  const isRunning = status === InfraResearchStatus.Running

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="large"
        flex={1}
        minWidth={0}
        paddingRight={spacing.xsmall}
        overflow="auto"
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
          <Flex gap="small">
            {status && (
              <Chip
                clickable
                onClick={() => {
                  // TODO: open new chat panel
                }}
                size="large"
                fillLevel={2}
                severity={statusToSeverity[status]}
              >
                {isRunning ? (
                  <Flex
                    gap="xsmall"
                    align="center"
                  >
                    <SpinnerAlt />
                    <span>View progress</span>
                  </Flex>
                ) : (
                  capitalize(status)
                )}
              </Chip>
            )}
            {status === InfraResearchStatus.Completed && id && (
              <Button
                small
                secondary
                loading={createThreadLoading}
                onClick={() =>
                  createNewThread({
                    summary: `Further discussion about "${truncate(infraResearch?.prompt ?? '', { length: 30 })}"`,
                    researchId: id,
                  })
                }
              >
                Analyze further with Plural AI
              </Button>
            )}
          </Flex>
        </StretchedFlex>
        <Divider backgroundColor="border" />
        {fixError && <GqlError error={fixError} />}
        {parseError && (
          <GqlError
            error={parseError}
            action={
              <Button
                small
                loading={fixLoading}
                startIcon={<AiSparkleFilledIcon />}
                onClick={() =>
                  fixResearchDiagram({
                    variables: { id: id ?? '', error: parseError.message },
                  })
                }
              >
                Fix parse errors
              </Button>
            }
          />
        )}
        <Body2BoldP $color="text">Diagram</Body2BoldP>
        <Flex
          direction="column"
          gap="medium"
        >
          {isRunning && (
            <Body1P $shimmer>
              Generating your diagram. This may take a few minutes. Feel free to
              leave the page while the agent runs in the background.
            </Body1P>
          )}
          {isRunning || loading ? (
            <RectangleSkeleton
              $width="100%"
              $height={300}
            />
          ) : (
            <InfraResearchDiagram
              diagram={diagram}
              setParseError={setParseError}
            />
          )}
        </Flex>
        <Body2BoldP $color="text">Analysis</Body2BoldP>
        {isRunning || loading ? (
          <Flex
            direction="column"
            gap="medium"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <RectangleSkeleton
                key={index}
                $width={`${100 - [12, 0, 5, 3][index % 4]}%`}
                $height="medium"
              />
            ))}
          </Flex>
        ) : (
          <InfraResearchAnalysis analysis={analysis} />
        )}
      </Flex>
      <ResponsiveLayoutSidecarContainer $breakpointWidth={768}>
        <InfraResearchSidecar
          infraResearch={infraResearch}
          loading={!infraResearch && loading}
        />
      </ResponsiveLayoutSidecarContainer>
    </WrapperSC>
  )
}

const statusToSeverity: Record<InfraResearchStatus, ChipSeverity> = {
  [InfraResearchStatus.Running]: 'neutral',
  [InfraResearchStatus.Completed]: 'success',
  [InfraResearchStatus.Failed]: 'danger',
  [InfraResearchStatus.Pending]: 'info',
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  width: '100%',
  height: '100%',
  minHeight: 0,
}))
