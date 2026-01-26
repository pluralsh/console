import {
  AiSparkleFilledIcon,
  Button,
  ButtonProps,
  Chip,
  ChipProps,
  ChipSeverity,
  Divider,
  EmptyState,
  Flex,
  ReloadIcon,
  SpinnerAlt,
  Tooltip,
  useSetBreadcrumbs,
  WrapWithIf,
} from '@pluralsh/design-system'
import { useChatbot } from 'components/ai/AIContext'
import { RunShareMenu } from 'components/ai/RunShareMenu'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body1P, Body2BoldP } from 'components/utils/typography/Text'
import {
  AgentRunStatus,
  InfraResearchFragment,
  InfraResearchStatus,
  useCreateInfraResearchMutation,
  useFixResearchDiagramMutation,
  useInfraResearchQuery,
  useUpdateInfraResearchMutation,
} from 'generated/graphql'
import { capitalize, truncate } from 'lodash'
import { ReactNode, useMemo, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { spacing } = useTheme()
  const { researchId: id = '' } =
    useMatch(`${AI_INFRA_RESEARCH_ABS_PATH}/:${AI_INFRA_RESEARCH_PARAM_ID}/*`)
      ?.params ?? {}
  const {
    isChatbotOpen,
    createNewThread,
    mutationLoading: createThreadLoading,
    goToInfraResearch,
  } = useChatbot()

  const [parseError, setParseError] = useState<Nullable<Error>>(null)
  const [parseFixAttempts, setParseFixAttempts] = useState(0)

  const { data, loading, error } = useInfraResearchQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const infraResearch = data?.infraResearch
  const isLoading = !data && loading

  const [updateResearch, { loading: updateLoading, error: updateError }] =
    useUpdateInfraResearchMutation()

  const [
    fixResearchDiagram,
    { loading: fixLoading, error: fixError, reset: resetFix },
  ] = useFixResearchDiagramMutation({
    onCompleted: () => setParseFixAttempts((prev) => prev + 1),
  })
  const recreateMutation = useCreateInfraResearchMutation({
    variables: { attributes: { prompt: infraResearch?.prompt || '' } },
    onCompleted: ({ createInfraResearch }) => {
      if (createInfraResearch?.id) {
        navigate(
          getInfraResearchAbsPath({ infraResearchId: createInfraResearch.id })
        )
        goToInfraResearch(createInfraResearch.id)
        setParseError(null)
        resetFix()
      }
    },
  })

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

  const { status, analysis, diagram, threads, published } = infraResearch ?? {}
  const isRunning = status === InfraResearchStatus.Running

  const headerButtons =
    status === InfraResearchStatus.Completed ? (
      <Flex gap="small">
        <RegenerateButton
          secondary
          mutation={recreateMutation}
          tooltip={
            <span>
              Creates a new research with same prompt
              <br />
              Useful if you want to try it again fresh
            </span>
          }
        />

        <Button
          small
          secondary
          loading={createThreadLoading}
          onClick={() =>
            createNewThread({
              researchId: id,
              summary: `Further discussion about "${truncate(infraResearch?.prompt ?? '', { length: 30 })}"`,
            })
          }
        >
          Analyze further with Plural AI
        </Button>
      </Flex>
    ) : null

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
            loading={isLoading}
            first="Prompt"
            firstPartialType="subtitle1"
            firstColor="text"
            second={infraResearch?.prompt}
            secondPartialType="body2"
            secondColor="text-xlight"
          />
          <Flex
            gap="small"
            flexShrink={0}
          >
            {status && (
              <RunStatusChip
                size="large"
                status={status}
                runningText="View progress"
                {...((isRunning || (threads?.length ?? 0) > 1) && {
                  clickable: true,
                  onClick: () => goToInfraResearch(id),
                })}
              />
            )}
            {!isChatbotOpen && headerButtons}
            {status !== InfraResearchStatus.Failed && (
              <RunShareMenu
                isShared={published}
                setIsShared={(published) =>
                  updateResearch({
                    variables: { id, attributes: { published } },
                  })
                }
                loading={updateLoading}
                error={updateError}
                label="Share research"
              />
            )}
          </Flex>
        </StretchedFlex>
        {isChatbotOpen && headerButtons}
        <Divider backgroundColor="border" />
        {recreateMutation[1].error && (
          <GqlError error={recreateMutation[1].error} />
        )}
        {fixError && <GqlError error={fixError} />}
        {parseError && (
          <GqlError
            error={parseError}
            action={
              parseFixAttempts < 2 ? (
                <Tooltip
                  placement="top"
                  label={
                    <span>
                      Attempts to fix Mermaid syntax errors automatically-
                      success may vary
                    </span>
                  }
                  css={{ maxWidth: 275 }}
                >
                  <Button
                    small
                    loading={fixLoading}
                    startIcon={<AiSparkleFilledIcon />}
                    onClick={() =>
                      fixResearchDiagram({
                        variables: { id, error: parseError.message },
                      })
                    }
                  >
                    Fix parse errors
                  </Button>
                </Tooltip>
              ) : (
                <RegenerateButton mutation={recreateMutation} />
              )
            }
          />
        )}
        {status === InfraResearchStatus.Failed ? (
          <GqlError
            error="An error occurred while generating this research. Try running it again with the button below."
            action={<RegenerateButton mutation={recreateMutation} />}
          />
        ) : (
          <>
            <Body2BoldP $color="text">Diagram</Body2BoldP>
            <Flex
              direction="column"
              gap="medium"
            >
              {isRunning && (
                <Body1P $shimmer>
                  Generating your diagram. This may take a few minutes. Feel
                  free to leave the page while the agent runs in the background.
                </Body1P>
              )}
              {isRunning || isLoading ? (
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
            {isRunning || isLoading ? (
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
          </>
        )}
      </Flex>
      <ResponsiveLayoutSidecarContainer $breakpointWidth={768}>
        <InfraResearchSidecar
          infraResearch={infraResearch}
          loading={isLoading}
        />
      </ResponsiveLayoutSidecarContainer>
    </WrapperSC>
  )
}

function RegenerateButton({
  mutation,
  tooltip,
  ...props
}: {
  mutation: ReturnType<typeof useCreateInfraResearchMutation>
  tooltip?: ReactNode
} & ButtonProps) {
  const [regenerate, { loading }] = mutation
  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={
        <Tooltip
          placement="top"
          label={tooltip}
        />
      }
    >
      <Button
        small
        loading={loading}
        onClick={() => regenerate()}
        startIcon={<ReloadIcon />}
        {...props}
      >
        Regenerate
      </Button>
    </WrapWithIf>
  )
}

export function RunStatusChip({
  status,
  runningText = 'Running',
  ...props
}: {
  status: Nullable<InfraResearchStatus | AgentRunStatus>
  runningText?: string
} & ChipProps) {
  if (!status) return null
  const isRunning =
    status === InfraResearchStatus.Running || status === AgentRunStatus.Running
  return (
    <Chip
      fillLevel={isRunning ? 2 : 1}
      severity={statusToSeverity[status]}
      {...props}
    >
      {isRunning ? (
        <Flex
          gap="xsmall"
          align="center"
        >
          <SpinnerAlt />
          <span>{runningText}</span>
        </Flex>
      ) : (
        capitalize(status)
      )}
    </Chip>
  )
}

const statusToSeverity: Record<
  InfraResearchStatus | AgentRunStatus,
  ChipSeverity
> = {
  [InfraResearchStatus.Running]: 'neutral',
  [InfraResearchStatus.Completed]: 'success',
  [InfraResearchStatus.Failed]: 'danger',
  [InfraResearchStatus.Pending]: 'info',
  [AgentRunStatus.Cancelled]: 'neutral',
  [AgentRunStatus.Successful]: 'success',
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
