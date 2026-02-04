import {
  AiSparkleFilledIcon,
  ArrowTopRightIcon,
  Button,
  ButtonProps,
  Card,
  CardProps,
  CloseIcon,
  DiscoverIcon,
  Flex,
  FormField,
  IconFrame,
  Markdown,
  SelectButton,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  AgentRunFragment,
  AgentRunMode,
  AgentRunStatus,
  useAgentRunTinyQuery,
  useCreateAgentRunMutation,
} from 'generated/graphql'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { AI_SETTINGS_AGENT_RUNTIMES_ABS_PATH } from 'routes/settingsRoutesConst'
import styled, { useTheme } from 'styled-components'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { AgentRunRepoSelector } from './AgentRunRepoSelector'

export function AgentRunFixButton({
  headerTitle,
  initialRepo,
  initialPrompt,
  ...props
}: {
  headerTitle: string
  initialPrompt: string
  initialRepo?: Nullable<string>
} & ButtonProps) {
  const { colors } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [prompt, setPrompt] = useState(initialPrompt)

  const menuBtnRef = useRef<HTMLButtonElement>(null)
  useOutsideClick(menuBtnRef, () => setDropdownOpen(false))

  const [agentRun, setAgentRun] = useState<AgentRunFragment | null>(null)

  return (
    <div css={{ position: 'relative', whiteSpace: 'nowrap' }}>
      <Button
        ref={menuBtnRef}
        onClick={() => setDropdownOpen((prev) => !prev)}
        startIcon={<AiSparkleFilledIcon />}
        disabled={!!dropdownOpen}
        {...props}
      />
      <AgentRunFormPopupSC
        type="header"
        linkStyles={false}
        isOpen={dropdownOpen}
        setIsOpen={setDropdownOpen}
        fillLevel={1}
      >
        <StretchedFlex>
          <StackedText
            first={headerTitle}
            firstPartialType="body1"
            firstColor="text-light"
            icon={<DiscoverIcon />}
            iconGap="xsmall"
          />
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon color={colors['icon-light']} />}
            onClick={() => setDropdownOpen(false)}
          />
        </StretchedFlex>
        {!!agentRun ? (
          <>
            <Flex
              direction="column"
              maxHeight={280}
              overflow="auto"
            >
              <Markdown text={prompt} />
            </Flex>
            <AgentRunInfoCard agentRun={agentRun} />
            <Button
              as={Link}
              to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
              endIcon={<ArrowTopRightIcon />}
              alignSelf="end"
            >
              View run details
            </Button>
          </>
        ) : (
          <AgentRunForm
            initialRepo={initialRepo}
            prompt={prompt}
            setPrompt={setPrompt}
            setAgentRun={setAgentRun}
          />
        )}
      </AgentRunFormPopupSC>
    </div>
  )
}

function AgentRunForm({
  initialRepo,
  prompt,
  setPrompt,
  setAgentRun,
}: {
  initialRepo?: Nullable<string>
  prompt: string
  setPrompt: (prompt: string) => void
  setAgentRun: (agentRun: AgentRunFragment) => void
}) {
  const [runtimeId, setRuntimeId] = useState<string>('')
  const [repository, setRepository] = useState<string>(initialRepo ?? '')

  const [mutation, { loading, error }] = useCreateAgentRunMutation({
    variables: {
      runtimeId,
      attributes: { prompt, mode: AgentRunMode.Write, repository },
    },
    onCompleted: ({ createAgentRun }) =>
      createAgentRun && setAgentRun(createAgentRun),
  })

  const canSubmit = !!runtimeId && !!repository && !!prompt && !loading

  return (
    <>
      {error && <GqlError error={error} />}
      <FormField
        label="Select a runtime"
        caption={
          <InlineLink
            as={Link}
            to={AI_SETTINGS_AGENT_RUNTIMES_ABS_PATH}
            target="_blank"
          >
            Runtime settings
          </InlineLink>
        }
      >
        <FillLevelDiv fillLevel={2}>
          <AIAgentRuntimesSelector
            autoSelectDefault
            allowDeselect={false}
            selectedRuntimeId={runtimeId}
            setSelectedRuntimeId={(runtimeId) =>
              runtimeId && setRuntimeId(runtimeId)
            }
            outerStyles={{ width: '100%' }}
          />
        </FillLevelDiv>
      </FormField>
      <FormField label="Select a repository URL">
        <AgentRunRepoSelector
          defaultMostRecent={false}
          selectedRepository={repository}
          setSelectedRepository={(repository) =>
            repository && setRepository(repository)
          }
          triggerButton={
            <SelectButton>{repository || 'Select repository'}</SelectButton>
          }
          leftContent={undefined}
        />
      </FormField>
      <PromptInputBoxSC>
        <EditableDiv
          initialValue={prompt}
          setValue={setPrompt}
          placeholder="Enter a prompt for the AI agent"
          disabled={loading}
          css={{ height: 140 }}
        />
      </PromptInputBoxSC>
      <Button
        disabled={!canSubmit}
        loading={loading}
        onClick={() => mutation()}
        alignSelf="end"
      >
        Attempt fix
      </Button>
    </>
  )
}

export function AgentRunInfoCard({
  agentRun: { id, status },
  showLinkButton = false,
  ...props
}: {
  agentRun: AgentRunFragment
  showLinkButton?: boolean
} & CardProps) {
  const { colors } = useTheme()
  const isRunning =
    status === AgentRunStatus.Running || status === AgentRunStatus.Pending
  const { data } = useAgentRunTinyQuery({
    variables: { id },
    skip: !isRunning,
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  })
  return (
    <AgentRunStatusBoxSC {...props}>
      <Flex
        align="center"
        gap="small"
        flex={1}
      >
        <DiscoverIcon
          size={16}
          color={colors['icon-default']}
        />
        <Body2BoldP $shimmer={isRunning}>
          {status === AgentRunStatus.Successful
            ? 'Run complete'
            : 'Started agent run'}
        </Body2BoldP>
      </Flex>
      <RunStatusChip
        status={data?.agentRun?.status ?? status}
        fillLevel={2}
      />
      {showLinkButton && (
        <Button
          small
          as={Link}
          to={getAgentRunAbsPath({ agentRunId: id })}
          endIcon={<ArrowTopRightIcon />}
        >
          View details
        </Button>
      )}
    </AgentRunStatusBoxSC>
  )
}

export const AgentRunFormPopupSC = styled(SimplePopupMenu)(({ theme }) => ({
  width: 578,
  padding: theme.spacing.medium,
  gap: theme.spacing.large,
  transform: 'translateY(20px)',
  marginBottom: theme.spacing.xxlarge,
  boxShadow: theme.boxShadows.moderate,
}))

const PromptInputBoxSC = styled(Card)(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  '&:focus-within': {
    border: theme.borders['outline-focused'],
  },
}))

const AgentRunStatusBoxSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
  width: '100%',
}))
