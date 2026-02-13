import {
  Accordion,
  AccordionItem,
  AiSparkleFilledIcon,
  Button,
  Chip,
  CloseIcon,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  FormField,
  IconFrame,
  PrOpenIcon,
  ReloadIcon,
  SpinnerAlt,
} from '@pluralsh/design-system'
import {
  AgentRunFormPopupSC,
  PromptInputBoxSC,
} from 'components/ai/agent-runs/AgentRunFixButton'
import { AIAgentRuntimesSelector } from 'components/ai/agent-runs/AIAgentRuntimesSelector'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { GqlError } from 'components/utils/Alert'
import { EditableDiv } from 'components/utils/EditableDiv'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import {
  ClusterOverviewDetailsFragment,
  ClusterUpgradeFragment,
  ClusterUpgradeStatus,
  useCreateClusterUpgradeMutation,
} from 'generated/graphql'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_SETTINGS_AGENT_RUNTIMES_ABS_PATH } from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'

type CurUpgradeStatus = 'none' | 'running' | 'completed' | 'failed'

export function ClusterUpgradeAgentButton({
  type,
  cluster,
  openFlyover,
}: {
  type: 'standard' | 'retry'
  cluster: ClusterOverviewDetailsFragment
  openFlyover?: () => void
}) {
  const { colors } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [prompt, setPrompt] = useState<Nullable<string>>(null)
  const [runtimeId, setRuntimeId] = useState<string>('')

  const wrapperRef = useRef<HTMLDivElement>(null)
  useOutsideClick(wrapperRef, () => setDropdownOpen(false), true)

  const [createClusterUpgrade, { loading, error }] =
    useCreateClusterUpgradeMutation({
      variables: {
        id: cluster.id,
        attributes: { prompt, runtimeId },
      },
      onCompleted: () => {
        openFlyover?.()
        setDropdownOpen(false)
      },
      refetchQueries: ['ClusterOverviewDetails'],
      awaitRefetchQueries: true,
    })

  const curUpgrade = cluster.currentUpgrade
  const curUpgradeStatus = getCurUpgradeStatus(curUpgrade)
  const renderPopupForm =
    type === 'retry' ||
    curUpgradeStatus === 'none' ||
    curUpgradeStatus === 'failed'

  const canSubmit = !!runtimeId && !loading
  return (
    <div
      css={{ position: 'relative', whiteSpace: 'nowrap' }}
      ref={wrapperRef}
    >
      <Flex
        gap="small"
        align="center"
      >
        {type === 'retry' ? (
          curUpgradeStatus !== 'running' && (
            <Button
              small
              secondary
              onClick={() => setDropdownOpen(true)}
              startIcon={<ReloadIcon />}
              disabled={!!dropdownOpen}
            >
              Retry upgrade
            </Button>
          )
        ) : (
          <>
            {curUpgradeStatus === 'failed' && (
              <Chip
                size="large"
                iconColor="icon-danger"
                icon={<FailedFilledIcon />}
              >
                Upgrade plan failed
              </Chip>
            )}
            {curUpgradeStatus === 'completed' ? (
              <Chip
                clickable
                size="large"
                icon={<PrOpenIcon />}
                onClick={openFlyover}
              >
                Review upgrade plan
              </Chip>
            ) : curUpgradeStatus === 'running' ? (
              <Button
                floating
                startIcon={<SpinnerAlt />}
                onClick={openFlyover}
              >
                View upgrade progress
              </Button>
            ) : (
              <Button
                onClick={() => setDropdownOpen(true)}
                startIcon={<AiSparkleFilledIcon />}
                disabled={!!dropdownOpen}
              >
                Attempt upgrade
              </Button>
            )}
          </>
        )}
      </Flex>
      {renderPopupForm && (
        <AgentRunFormPopupSC
          type="header"
          linkStyles={false}
          isOpen={dropdownOpen}
          setIsOpen={setDropdownOpen}
          fillLevel={1}
          css={{ transform: 'translateY(-10px)' }}
        >
          {error && <GqlError error={error} />}
          <StretchedFlex>
            <StackedText
              first="Cluster upgrade"
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
          <Accordion type="single">
            <AccordionItem trigger="Customize agent prompt">
              <PromptInputBoxSC>
                <EditableDiv
                  setValue={setPrompt}
                  placeholder="Enter a custom prompt for the AI agent (useful for handling legacy setups that Plural doesn't natively know about)"
                  disabled={loading}
                  css={{ height: 140 }}
                />
              </PromptInputBoxSC>
            </AccordionItem>
          </Accordion>
          <Button
            disabled={!canSubmit}
            loading={loading}
            onClick={() => createClusterUpgrade()}
            alignSelf="end"
          >
            Attempt upgrade
          </Button>
        </AgentRunFormPopupSC>
      )}
    </div>
  )
}

const getCurUpgradeStatus = (
  clusterUpgrade: Nullable<ClusterUpgradeFragment>
): CurUpgradeStatus => {
  if (!clusterUpgrade) return 'none'
  switch (clusterUpgrade.status) {
    case ClusterUpgradeStatus.Pending:
    case ClusterUpgradeStatus.InProgress:
      return 'running'
    case ClusterUpgradeStatus.Completed:
      return 'completed'
    case ClusterUpgradeStatus.Failed:
      return 'failed'
  }
}
