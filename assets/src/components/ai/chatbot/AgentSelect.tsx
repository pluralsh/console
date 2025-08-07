import {
  ArrowRightIcon,
  Button,
  CaretUpIcon,
  KubernetesIcon,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  RobotIcon,
  Select,
  TerraformLogoIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { capitalize } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AI_AGENT_ABS_PATH } from 'routes/aiRoutesConsts.tsx'
import { useTheme } from 'styled-components'
import { AgentSessionType } from '../../../generated/graphql.ts'
import { TRUNCATE } from '../../utils/truncate.ts'
import { CaptionP } from '../../utils/typography/Text.tsx'
import { AgentSessionT, useChatbot } from '../AIContext.tsx'

export function AgentIcon({
  type,
  size = 16,
}: {
  type: Nullable<AgentSessionType>
  size?: number
}) {
  switch (type) {
    case AgentSessionType.Terraform:
      return (
        <TerraformLogoIcon
          fullColor
          size={size}
        />
      )
    case AgentSessionType.Kubernetes:
      return (
        <KubernetesIcon
          color={'#326CE5'} // TODO: Fix fullColor prop in KubernetesIcon.
          size={size}
        />
      )
    default:
      return <RobotIcon size={size} />
  }
}

export function AgentSelect() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { goToLastNonAgentThread, selectedAgent, setAgentInitMode } =
    useChatbot()
  const [open, setOpen] = useState(false)

  const icon = useMemo(
    () => <AgentIcon type={selectedAgent} />,
    [selectedAgent]
  )

  const onAgentChange = useCallback(
    (newAgent: AgentSessionT) => {
      if (newAgent) {
        setOpen(false)
        setAgentInitMode(newAgent)
      } else {
        setOpen(false)
        goToLastNonAgentThread()
      }
    },
    [goToLastNonAgentThread, setAgentInitMode]
  )

  return (
    <Select
      isOpen={open}
      onOpenChange={setOpen}
      selectedKey={selectedAgent ?? ''}
      onSelectionChange={(key) => onAgentChange(key as AgentSessionT)}
      label="agent"
      width={330}
      dropdownHeaderFixed={
        <div
          css={{
            color: theme.colors['text-xlight'],
            padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
          }}
        >
          Start a new agent session
        </div>
      }
      dropdownFooterFixed={
        <>
          <ListBoxFooter
            css={{
              borderBottom: theme.borders.input,
            }}
            onClick={() => {
              navigate(AI_AGENT_ABS_PATH)
              setOpen(false)
            }}
            rightContent={<ArrowRightIcon />}
          >
            View all agent sessions
          </ListBoxFooter>
          {selectedAgent ? (
            <ListBoxFooterPlus
              onClick={() => onAgentChange(null)}
              leftContent={<RobotIcon />}
            >
              Deselect agent
              <CaptionP>Go to the last non-agent or a new chat</CaptionP>
            </ListBoxFooterPlus>
          ) : undefined}
        </>
      }
      triggerButton={
        <Button
          startIcon={icon}
          endIcon={
            <CaretUpIcon
              style={{
                pointerEvents: 'none',
                transition: 'transform 0.2s ease-in-out',
                transform: open ? 'scaleY(1)' : 'scaleY(-1)',
              }}
            />
          }
          tertiary
          small
        >
          <Tooltip label="Use our coding agent to run a background task">
            <span css={{ ...TRUNCATE }}>
              {capitalize(`${selectedAgent ?? ''} agent`.trim())}
            </span>
          </Tooltip>
        </Button>
      }
    >
      <ListBoxItem
        key={AgentSessionType.Terraform}
        leftContent={<AgentIcon type={AgentSessionType.Terraform}></AgentIcon>}
        label="Terraform agent"
      />
      <ListBoxItem
        key={AgentSessionType.Kubernetes}
        leftContent={<AgentIcon type={AgentSessionType.Kubernetes}></AgentIcon>}
        label="Kubernetes agent"
      />
    </Select>
  )
}
