import {
  Button,
  CaretUpIcon,
  KubernetesIcon,
  ListBoxItem,
  RocketIcon,
  SearchIcon,
  Select,
  Toast,
  Tooltip,
} from '@pluralsh/design-system'
import { useChatbot } from 'components/ai/AIContext'
import { TRUNCATE } from 'components/utils/truncate.ts'
import {
  AgentSessionType,
  useUpdateChatThreadMutation,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { useCallback, useState } from 'react'

export function AgentSessionTypeSelect() {
  const { currentThread } = useChatbot()
  const [open, setOpen] = useState(false)

  const [mutation, { loading: loading, error }] = useUpdateChatThreadMutation()
  const updateSessionType = useCallback(
    (type: AgentSessionType | null) => {
      if (!currentThread?.id || type === currentThread?.session?.type) return
      mutation({
        variables: {
          id: currentThread?.id,
          attributes: { session: { type }, summary: currentThread?.summary },
        },
      })
    },
    [currentThread, mutation]
  )

  const curType = currentThread?.session?.type

  if (
    !curType ||
    curType === AgentSessionType.Kubernetes ||
    curType === AgentSessionType.Terraform
  )
    return null

  return (
    <>
      <Select
        isOpen={open}
        onOpenChange={setOpen}
        selectedKey={curType ?? ''}
        onSelectionChange={(key) =>
          updateSessionType(key ? (key as AgentSessionType) : null)
        }
        width={260}
        triggerButton={
          <Button
            small
            loading={loading}
            secondary
            startIcon={options.find((o) => o.type === curType)?.icon}
            endIcon={
              <CaretUpIcon
                style={{
                  pointerEvents: 'none',
                  transition: 'transform 0.2s ease-in-out',
                  transform: open ? 'scaleY(1)' : 'scaleY(-1)',
                }}
              />
            }
          >
            <Tooltip
              css={{ maxWidth: 500 }}
              placement="top"
              label="Change the type of session you are having with Plural AI"
            >
              <span css={{ ...TRUNCATE }}>
                {capitalize(curType ?? 'Change session type')}
              </span>
            </Tooltip>
          </Button>
        }
      >
        {options.map(({ type, description, icon }) => (
          <ListBoxItem
            key={type}
            label={capitalize(type)}
            description={description}
            leftContent={icon}
          />
        ))}
      </Select>
      <Toast
        show={!!error}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error updating session type:</strong> {error?.message}
      </Toast>
    </>
  )
}

const options = [
  {
    type: AgentSessionType.Manifests,
    description: 'Author K8s yaml',
    icon: <KubernetesIcon />,
  },
  {
    type: AgentSessionType.Provisioning,
    description: 'Provision new infra',
    icon: <RocketIcon />,
  },
  {
    type: AgentSessionType.Search,
    description: 'Query your existing infra',
    icon: <SearchIcon />,
  },
]
