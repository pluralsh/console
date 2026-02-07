import {
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
import ejs from 'ejs'
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
import clusterUpgradePrompt from './cluster-upgrade-prompt.ejs?raw'
import { ClusterUpgradeAgentFlyover } from './ClusterUpgradeAgentFlyover'

type CurUpgradeStatus = 'none' | 'running' | 'completed' | 'failed'

export function ClusterUpgradeAgentButton({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const { colors } = useTheme()
  const [flyoverOpen, setFlyoverOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [prompt, setPrompt] = useState(() =>
    ejs.render(clusterUpgradePrompt, { cluster })
  )
  const [runtimeId, setRuntimeId] = useState<string>('')

  const menuBtnRef = useRef<HTMLButtonElement>(null)
  useOutsideClick(menuBtnRef, () => setDropdownOpen(false))

  const [createClusterUpgrade, { loading, error }] =
    useCreateClusterUpgradeMutation({
      variables: {
        id: cluster.id,
        attributes: { prompt, runtimeId },
      },
      onCompleted: () => setFlyoverOpen(true),
      refetchQueries: ['ClusterOverviewDetails'],
      awaitRefetchQueries: true,
    })

  const curUpgrade = cluster.currentUpgrade
  const curUpgradeStatus = getCurUpgradeStatus(curUpgrade)
  const renderPopupForm =
    curUpgradeStatus === 'none' || curUpgradeStatus === 'failed'

  const canSubmit = !!runtimeId && !!prompt && !loading
  return (
    <div css={{ position: 'relative', whiteSpace: 'nowrap' }}>
      <Flex
        gap="small"
        align="center"
      >
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
            onClick={() => setFlyoverOpen(true)}
          >
            Review upgrade plan
          </Chip>
        ) : curUpgradeStatus === 'running' ? (
          <Button
            floating
            startIcon={<SpinnerAlt />}
            onClick={() => setFlyoverOpen(true)}
          >
            View upgrade progress
          </Button>
        ) : (
          <Button
            ref={menuBtnRef}
            onClick={() => setDropdownOpen((prev) => !prev)}
            startIcon={<AiSparkleFilledIcon />}
            disabled={!!dropdownOpen}
          >
            Attempt upgrade
          </Button>
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
            onClick={() => createClusterUpgrade()}
            alignSelf="end"
          >
            Attempt upgrade
          </Button>
        </AgentRunFormPopupSC>
      )}
      {curUpgrade && (
        <ClusterUpgradeAgentFlyover
          clusterUpgrade={curUpgrade}
          open={flyoverOpen}
          onClose={() => setFlyoverOpen(false)}
        />
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
