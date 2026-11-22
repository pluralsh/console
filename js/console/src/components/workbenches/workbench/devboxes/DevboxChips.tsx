import { Chip, ChipSeverity, Flex, PrOpenIcon } from '@pluralsh/design-system'
import {
  AgentRuntimeType,
  DevboxAgentType,
  DevboxInstanceStatus,
  DevboxProbeStatus,
  DevboxPullRequestFragment,
  DevboxSnapshotStatus,
  DevboxStatus,
  PullRequestSource,
} from 'generated/graphql'
import { aiProviderToIcon } from 'components/settings/ai/AISettingsConfiguredProviders'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { Link } from 'react-router-dom'
import { getWorkbenchDevboxInstanceAbsPath } from 'routes/workbenchesRoutesConsts'
import { agentLabel, proxyModelOf } from './devboxStartForm'
import { threadTitle } from './devboxThreads'

const AGENT_RUNTIME: Record<DevboxAgentType, AgentRuntimeType> = {
  [DevboxAgentType.Claude]: AgentRuntimeType.Claude,
  [DevboxAgentType.Codex]: AgentRuntimeType.Codex,
  [DevboxAgentType.Gemini]: AgentRuntimeType.Gemini,
  [DevboxAgentType.Opencode]: AgentRuntimeType.Opencode,
  [DevboxAgentType.Pi]: AgentRuntimeType.Pi,
}

export function DevboxAgentIcon({
  agent,
  size = 14,
}: {
  agent: Nullable<DevboxAgentType>
  size?: number
}) {
  const Icon =
    runtimeToIcon[(agent && AGENT_RUNTIME[agent]) || AgentRuntimeType.Custom]
  return (
    <Icon
      size={size}
      fullColor
    />
  )
}

export function DevboxAgentLabel({
  agent,
}: {
  agent: Nullable<DevboxAgentType>
}) {
  return (
    <Flex
      gap="xsmall"
      align="center"
      as="span"
    >
      <DevboxAgentIcon agent={agent} />
      {agentLabel(agent)}
    </Flex>
  )
}

// the AI provider an AI proxy model routes to, nothing for an agent's own aliases
export function DevboxModelProviderIcon({
  model,
  size = 14,
}: {
  model: Nullable<string>
  size?: number
}) {
  const proxy = proxyModelOf(model)
  if (!proxy) return null
  const Icon = aiProviderToIcon[proxy.provider]
  return (
    <Icon
      size={size}
      fullColor
    />
  )
}

export function DevboxModelLabel({
  model,
  label,
}: {
  model: Nullable<string>
  label: Nullable<string>
}) {
  return (
    <Flex
      gap="xsmall"
      align="center"
      as="span"
    >
      <DevboxModelProviderIcon model={model} />
      {label}
    </Flex>
  )
}

const BOX_STATUS: Record<DevboxStatus, ChipSeverity> = {
  [DevboxStatus.Pending]: 'info',
  [DevboxStatus.Ready]: 'success',
  [DevboxStatus.Degraded]: 'warning',
  [DevboxStatus.Failed]: 'danger',
}

export function DevboxStatusChip({
  status,
}: {
  status: Nullable<DevboxStatus>
}) {
  if (!status) return null
  return (
    <Chip
      size="small"
      severity={BOX_STATUS[status]}
    >
      {status.toLowerCase()}
    </Chip>
  )
}

const INSTANCE_STATUS: Record<DevboxInstanceStatus, ChipSeverity> = {
  [DevboxInstanceStatus.Pending]: 'info',
  [DevboxInstanceStatus.Provisioning]: 'info',
  [DevboxInstanceStatus.Running]: 'success',
  [DevboxInstanceStatus.Suspended]: 'neutral',
  [DevboxInstanceStatus.Snapshotting]: 'info',
  [DevboxInstanceStatus.Completed]: 'neutral',
  [DevboxInstanceStatus.Failed]: 'danger',
  [DevboxInstanceStatus.Cancelled]: 'neutral',
}

export function DevboxInstanceStatusChip({
  status,
}: {
  status: Nullable<DevboxInstanceStatus>
}) {
  if (!status) return null
  return (
    <Chip
      size="small"
      severity={INSTANCE_STATUS[status]}
    >
      {status.toLowerCase()}
    </Chip>
  )
}

const PROBE_STATUS: Record<DevboxProbeStatus, ChipSeverity> = {
  [DevboxProbeStatus.Pending]: 'info',
  [DevboxProbeStatus.Ok]: 'success',
  [DevboxProbeStatus.Failed]: 'warning',
  [DevboxProbeStatus.Missing]: 'danger',
}

export function DevboxProbeChip({
  status,
  error,
}: {
  status: Nullable<DevboxProbeStatus>
  error?: Nullable<string>
}) {
  if (!status) return null
  return (
    <Chip
      size="small"
      severity={PROBE_STATUS[status]}
      tooltip={error || undefined}
    >
      probe {status.toLowerCase()}
    </Chip>
  )
}

const SNAPSHOT_STATUS: Record<DevboxSnapshotStatus, ChipSeverity> = {
  [DevboxSnapshotStatus.Pending]: 'info',
  [DevboxSnapshotStatus.Ready]: 'success',
  [DevboxSnapshotStatus.Failed]: 'danger',
  [DevboxSnapshotStatus.Deleting]: 'neutral',
}

export function DevboxSnapshotStatusChip({
  status,
}: {
  status: Nullable<DevboxSnapshotStatus>
}) {
  if (!status) return null
  return (
    <Chip
      size="small"
      severity={SNAPSHOT_STATUS[status]}
    >
      {status.toLowerCase()}
    </Chip>
  )
}

export function shortDigest(digest: Nullable<string>) {
  if (!digest) return null
  const at = digest.indexOf('@')
  const sha = at >= 0 ? digest.slice(at + 1) : digest
  return sha.slice(0, 19)
}

export function prProvenance(pr: DevboxPullRequestFragment) {
  const parts = [
    pr.devbox?.name && `devbox ${pr.devbox.name}`,
    pr.devboxInstance &&
      `instance ${pr.devboxInstance.name || pr.devboxInstance.id.slice(0, 8)}`,
    pr.devboxThread && `thread ${threadTitle(pr.devboxThread)}`,
  ].filter(Boolean)
  if (!parts.length) return null
  const via =
    pr.source === PullRequestSource.Egress ? ' (observed at egress)' : ''
  return `Opened from ${parts.join(', ')}${via}`
}

// deep link back to the thread at the position the PR was opened
export function prThreadLink(pr: DevboxPullRequestFragment) {
  const instance = pr.devboxInstance
  if (!instance?.workbench?.id) return null
  const position = pr.metadata?.position as Nullable<number>
  return getWorkbenchDevboxInstanceAbsPath({
    workbenchId: instance.workbench.id,
    instanceId: instance.id,
    threadId: pr.devboxThread?.id,
    position,
  })
}

export function DevboxPrChips({
  pullRequests,
  showProvenance = false,
}: {
  pullRequests: Nullable<DevboxPullRequestFragment>[]
  showProvenance?: boolean
}) {
  const prs = pullRequests.filter((pr): pr is DevboxPullRequestFragment => !!pr)
  if (!prs.length) return null
  return (
    <Flex
      gap="xsmall"
      wrap="wrap"
    >
      {prs.map((pr) => {
        const threadLink = prThreadLink(pr)
        const provenance = prProvenance(pr)
        return (
          <Flex
            key={pr.id}
            gap="xxsmall"
            align="center"
          >
            <Chip
              size="small"
              clickable
              icon={<PrOpenIcon />}
              tooltip={provenance ?? pr.title}
              as="a"
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              truncateWidth={260}
            >
              {pr.title}
            </Chip>
            {showProvenance && threadLink && (
              <Chip
                size="small"
                clickable
                as={Link}
                to={threadLink}
                severity="info"
              >
                {pr.devboxThread ? 'View thread' : 'View instance'}
              </Chip>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}
