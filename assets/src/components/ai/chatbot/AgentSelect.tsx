import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  CloudIcon,
  KubernetesIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  RobotIcon,
  Select,
  TerraformLogoIcon,
  Toast,
  Tooltip,
} from '@pluralsh/design-system'
import { capitalize } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  AgentSessionType,
  useCreateAgentSessionMutation,
} from '../../../generated/graphql.ts'
import { TRUNCATE } from '../../utils/truncate.ts'
import { useChatbot } from '../AIContext.tsx'

function getIcon(type: Nullable<AgentSessionType>, size = 16) {
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
  const { currentThread, goToThread, goToThreadList } = useChatbot()
  const [open, setOpen] = useState(false)

  const agent = useMemo(
    () =>
      [AgentSessionType.Kubernetes, AgentSessionType.Terraform].find(
        (type) => type === currentThread?.session?.type
      ),
    [currentThread?.session?.type]
  )

  const icon = useMemo(() => getIcon(agent, 16), [agent])

  const [createAgentSession, { loading, error: agentSessionError }] =
    useCreateAgentSessionMutation({
      onCompleted: (data) => {
        if (data.createAgentSession?.id) goToThread(data.createAgentSession.id)
      },
    })

  const onAgentChange = useCallback(
    (newAgent: Nullable<AgentSessionType>) => {
      if (newAgent === agent || loading) return

      if (newAgent) {
        createAgentSession({
          variables: {
            attributes: {
              type: newAgent,
              connectionId: currentThread?.session?.connection?.id,
            },
          },
        })
      }

      if (!newAgent) goToThreadList()
    },
    [
      agent,
      createAgentSession,
      currentThread?.session?.connection?.id,
      goToThreadList,
      loading,
    ]
  )

  return (
    <>
      <Select
        isOpen={open}
        onOpenChange={setOpen}
        selectedKey={agent ?? ''}
        onSelectionChange={(key) =>
          onAgentChange(key as Nullable<AgentSessionType>)
        }
        label="agent"
        width={270}
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
              leftContent={<CloudIcon />}
            >
              Deselect agent
            </ListBoxFooterPlus>
          ) : undefined
        }
        triggerButton={
          // wrapper div prevents tooltip from interfering with trigger
          <div>
            <Tooltip label="Use our coding agent to run a background task">
              <Button
                loading={loading}
                startIcon={icon}
                endIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
                secondary
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
          leftContent={getIcon(AgentSessionType.Terraform)}
          label="Terraform agent"
          description="Descriptive sentence here" // TODO
        />
        <ListBoxItem
          key={AgentSessionType.Kubernetes}
          leftContent={getIcon(AgentSessionType.Kubernetes)}
          label="Kubernetes agent"
          description="Descriptive sentence here" // TODO
        />
      </Select>
      <Toast
        show={!!agentSessionError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating agent session:</strong>{' '}
        {agentSessionError?.message}
      </Toast>
    </>
  )
}
