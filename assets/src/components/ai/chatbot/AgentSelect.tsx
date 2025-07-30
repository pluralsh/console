import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  KubernetesIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  RobotIcon,
  Select,
  TerraformLogoIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { capitalize } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { AgentSessionType } from '../../../generated/graphql.ts'
import { TRUNCATE } from '../../utils/truncate.ts'
import { useChatbot } from '../AIContext.tsx'
import { CaptionP } from '../../utils/typography/Text.tsx'

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
  const {
    currentThread,
    goToLastNonAgentThread,
    agentInitMode,
    setAgentInitMode,
  } = useChatbot()
  const [open, setOpen] = useState(false)

  const agent = useMemo(() => {
    if (agentInitMode) return agentInitMode

    if (
      currentThread?.session?.type === AgentSessionType.Terraform ||
      currentThread?.session?.type === AgentSessionType.Kubernetes
    ) {
      return currentThread?.session?.type
    }

    return undefined
  }, [agentInitMode, currentThread?.session?.type])

  const icon = useMemo(() => <AgentIcon type={agent} />, [agent])

  const onAgentChange = useCallback(
    (newAgent: Nullable<AgentSessionType>) => {
      if (newAgent === agent) return

      if (newAgent) {
        setOpen(false)
        setAgentInitMode(newAgent)
      } else {
        setOpen(false)
        setAgentInitMode(null)
        goToLastNonAgentThread()
      }
    },
    [agent, goToLastNonAgentThread, setAgentInitMode]
  )

  return (
    <Select
      isOpen={open}
      onOpenChange={setOpen}
      selectedKey={agent ?? ''}
      onSelectionChange={(key) =>
        onAgentChange(key as Nullable<AgentSessionType>)
      }
      label="agent"
      width={300}
      dropdownHeaderFixed={
        <div
          css={{
            color: theme.colors['text-xlight'],
            padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
          }}
        >
          Select agent
        </div>
      }
      dropdownFooterFixed={
        agent ? (
          <ListBoxFooterPlus
            onClick={() => onAgentChange(undefined)}
            leftContent={<RobotIcon />}
          >
            Deselect agent
            <CaptionP>Go to the last non-agent or a new chat</CaptionP>
          </ListBoxFooterPlus>
        ) : undefined
      }
      triggerButton={
        // wrapper div prevents tooltip from interfering with trigger
        <div>
          <Tooltip label="Use our coding agent to run a background task">
            <Button
              startIcon={icon}
              endIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
              tertiary
              small
            >
              <span css={{ ...TRUNCATE }}>
                {capitalize(`${agent ?? ''} agent`.trim())}
              </span>
            </Button>
          </Tooltip>
        </div>
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
