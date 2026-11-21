import {
  Button,
  ListBoxItem,
  PrIcon,
  Select,
  Tooltip,
} from '@pluralsh/design-system'
import { repositoryMentionMetadata } from 'components/ai/chatbot/input/autocomplete/repositoryMention'
import { scmTypeToIcon } from 'components/self-service/pr/scm/PrScmConnectionsColumns'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import {
  DevboxPullRequestJobFragment,
  DevboxPullRequestJobStatus,
  useCreateDevboxPullRequestMutation,
  useDevboxPullRequestJobDeltaSubscription,
} from 'generated/graphql'
import { useState } from 'react'
import { useDevboxChanges } from './devboxChanges'

// host/owner/repo, without the scheme, any credentials in it, or a trailing .git
export function displayRemoteUrl(url: string) {
  return url
    .trim()
    .replace(/^[a-z+]+:\/\//i, '')
    .replace(/^[^@/]+@/, '')
    .replace(/^([^/:]+):(?!\d+\/)/, '$1/')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
}

// one click per repo: the box writes the title, body and commit message, commits, pushes, and console opens the pr
export function DevboxCreatePrButton({
  instanceId,
  agentsRunning,
  onCreated,
}: {
  instanceId: string
  agentsRunning: boolean
  onCreated: () => void
}) {
  const { popToast } = useSimpleToast()
  const { groups } = useDevboxChanges(instanceId, true, { poll: true })
  const [jobs, setJobs] = useState<
    Record<string, DevboxPullRequestJobFragment>
  >({})
  const track = (job: Nullable<DevboxPullRequestJobFragment>) =>
    job && setJobs((prev) => ({ ...prev, [job.repository]: job }))

  useDevboxPullRequestJobDeltaSubscription({
    variables: { instanceId },
    onData: ({ data }) => {
      const job = data.data?.devboxPullRequestJobDelta?.payload
      if (!job) return
      track(job)
      if (job.status === DevboxPullRequestJobStatus.Succeeded) {
        onCreated()
        popToast({
          content: job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Opened {job.title || 'the pull request'}
            </a>
          ) : (
            `Opened ${job.title || 'the pull request'}`
          ),
          severity: 'success',
        })
      }
      if (job.status === DevboxPullRequestJobStatus.Failed)
        popToast({
          content: job.error || "Couldn't create the pull request",
          severity: 'danger',
        })
    },
  })
  const [create, { loading }] = useCreateDevboxPullRequestMutation({
    onCompleted: (data) => track(data.createDevboxPullRequest),
    onError: (e) => popToast({ content: e.message, severity: 'danger' }),
  })

  const repos = (groups ?? []).map((g) => ({
    key: g.path || g.repository,
    name: g.repository,
    branch: g.branch,
    url: g.remoteUrl ? displayRemoteUrl(g.remoteUrl) : undefined,
    provider: g.remoteUrl
      ? repositoryMentionMetadata(g.remoteUrl).provider
      : undefined,
  }))
  const preparing = Object.values(jobs).filter(
    (j) => j.status === DevboxPullRequestJobStatus.Running
  )
  if (!repos.length && !preparing.length) return null

  const button = (
    <Button
      small
      secondary
      startIcon={<PrIcon />}
      loading={loading || !!preparing.length}
      disabled={agentsRunning}
    >
      Create PR
    </Button>
  )
  if (agentsRunning)
    return (
      <Tooltip label="Wait for the agents to finish their turn, so the PR doesn't pick up half-done edits">
        <span>{button}</span>
      </Tooltip>
    )
  return (
    <Select
      aria-label="Create a pull request for a repository"
      label="Repository"
      placement="right"
      width="400px"
      selectedKey={null}
      onSelectionChange={(key) =>
        key && create({ variables: { instanceId, repository: `${key}` } })
      }
      triggerButton={button}
    >
      {repos.map((r) => (
        <ListBoxItem
          key={r.key}
          label={r.name}
          leftContent={scmTypeToIcon[r.provider ?? '']}
          description={
            jobs[r.key]?.status === DevboxPullRequestJobStatus.Running
              ? 'Preparing…'
              : [r.url, r.branch].filter(Boolean).join(' · ') || undefined
          }
          disabled={jobs[r.key]?.status === DevboxPullRequestJobStatus.Running}
        />
      ))}
    </Select>
  )
}
