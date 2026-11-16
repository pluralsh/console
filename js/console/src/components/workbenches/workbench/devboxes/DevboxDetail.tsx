import {
  Button,
  Callout,
  Card,
  Chip,
  Code,
  Flex,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  Body2BoldP,
  CaptionP,
  Subtitle1H1,
  Subtitle2H1,
} from 'components/utils/typography/Text'
import {
  DevboxAgentFragment,
  DevboxCloudProvider,
  DevboxFragment,
  DevboxSnippetFormat,
  useDevboxPullRequestsQuery,
  useDevboxQuery,
} from 'generated/graphql'
import { ReactNode, useMemo } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  getWorkbenchDevboxesAbsPath,
  getWorkbenchDevboxStartAbsPath,
  WORKBENCH_DEVBOX_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  DevboxPrChips,
  DevboxProbeChip,
  DevboxStatusChip,
  prProvenance,
  shortDigest,
} from './DevboxChips'
import { DevboxIssuer, devboxTrustSnippets } from './devboxCloudTrust'
import { agentLabel, modelsOf } from './devboxStartForm'

export function devboxIssuerOf(
  box: Nullable<Pick<DevboxFragment, 'workloadIdentity'>>
): Nullable<DevboxIssuer> {
  const wi = box?.workloadIdentity
  if (!wi?.issuerUrl) return null
  return {
    url: wi.issuerUrl,
    subject: wi.subject,
    audiences: wi.audiences,
    snippets: (wi.snippets ?? []).filter(isNonNullable),
  }
}

export function DevboxDetail() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const devboxId = useParams()[WORKBENCH_DEVBOX_PARAM_ID] ?? ''
  const { data, loading, error } = useDevboxQuery({
    variables: { id: devboxId },
    skip: !devboxId,
    fetchPolicy: 'cache-and-network',
  })
  const prsQuery = useDevboxPullRequestsQuery({
    variables: { devboxId },
    skip: !devboxId,
    fetchPolicy: 'cache-and-network',
  })
  const box = data?.devbox
  const issuer = devboxIssuerOf(box)
  const prs = mapExistingNodes(prsQuery.data?.pullRequests)

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      headerActions={
        <>
          <Button
            small
            secondary
            as={Link}
            to={getWorkbenchDevboxesAbsPath(workbenchId)}
          >
            All boxes
          </Button>
          <Button
            small
            as={Link}
            to={getWorkbenchDevboxStartAbsPath({ workbenchId, devboxId })}
            disabled={!box}
          >
            Start instance
          </Button>
        </>
      }
    >
      <Flex
        direction="column"
        gap="large"
        padding="large"
      >
        {error && <GqlError error={error} />}
        {!box && loading ? (
          <RectangleSkeleton
            $height={200}
            $width="100%"
          />
        ) : box ? (
          <>
            <DevboxSummary box={box} />
            <DevboxConditions box={box} />
            <Section title="Agent catalog">
              <DevboxAgentCatalog agents={box.agents} />
            </Section>
            <DevboxPolicies box={box} />
            <Section title="Cloud identity">
              <DevboxCloudIdentity
                boxName={box.name}
                issuer={issuer}
              />
            </Section>
            <Section title="Pull requests">
              {prsQuery.error && <GqlError error={prsQuery.error} />}
              {prs.length ? (
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  {prs.map((pr) => (
                    <Flex
                      key={pr.id}
                      direction="column"
                      gap="xxsmall"
                    >
                      <DevboxPrChips
                        pullRequests={[pr]}
                        showProvenance
                      />
                      <CaptionP $color="text-xlight">
                        {prProvenance(pr)} · {fromNow(pr.insertedAt)}
                      </CaptionP>
                    </Flex>
                  ))}
                </Flex>
              ) : (
                <CaptionP $color="text-xlight">
                  No pull requests opened from this box yet.
                </CaptionP>
              )}
            </Section>
          </>
        ) : null}
      </Flex>
    </WorkbenchPageLayout>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Subtitle2H1>{title}</Subtitle2H1>
      {children}
    </Flex>
  )
}

function DevboxSummary({ box }: { box: DevboxFragment }) {
  return (
    <Card css={{ padding: 16 }}>
      <Flex
        direction="column"
        gap="small"
      >
        <Flex
          gap="small"
          align="center"
        >
          <Subtitle1H1>{box.name}</Subtitle1H1>
          <DevboxStatusChip status={box.status} />
          {box.browser && <Chip size="small">browser</Chip>}
        </Flex>
        <PropsGridSC>
          <Prop label="Cluster">{box.cluster?.name ?? '—'}</Prop>
          <Prop label="Image">{box.image ?? '—'}</Prop>
          <Prop label="Image digest">
            <span title={box.resolvedImage ?? undefined}>
              {shortDigest(box.resolvedImage) ?? '—'}
            </span>
          </Prop>
          <Prop label="Template revision">{box.templateRevision ?? '—'}</Prop>
          <Prop label="Max instances">{box.maxInstances ?? 'unlimited'}</Prop>
          <Prop label="Last heartbeat">
            {box.lastHeartbeatAt ? fromNow(box.lastHeartbeatAt) : 'never'}
          </Prop>
          <Prop label="Resources">
            {box.resources ? (
              <code>{JSON.stringify(box.resources)}</code>
            ) : (
              'default'
            )}
          </Prop>
        </PropsGridSC>
      </Flex>
    </Card>
  )
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <CaptionP $color="text-xlight">{label}</CaptionP>
      <Body2BoldP css={{ wordBreak: 'break-all' }}>{children}</Body2BoldP>
    </div>
  )
}

function DevboxConditions({ box }: { box: DevboxFragment }) {
  const failing = (box.conditions ?? [])
    .filter(isNonNullable)
    .filter((c) => c.status !== 'True')
  if (!failing.length) return null
  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      {failing.map((c) => (
        <Callout
          key={c.type}
          severity="warning"
          title={c.reason ? `${c.type}: ${c.reason}` : c.type}
        >
          {c.message}
          {/outdated|rebuild/i.test(`${c.type}${c.reason}`) &&
            ' Rebuild the image on the new devbox base image.'}
        </Callout>
      ))}
    </Flex>
  )
}

const agentColumnHelper = createColumnHelper<DevboxAgentFragment>()

export function DevboxAgentCatalog({
  agents,
}: {
  agents: Nullable<Nullable<DevboxAgentFragment>[]>
}) {
  const columns = useMemo(
    () => [
      agentColumnHelper.accessor((a) => a.type, {
        id: 'agent',
        header: 'Agent',
        cell: ({ row: { original: a } }) => (
          <Flex
            gap="xsmall"
            align="center"
          >
            <span>{agentLabel(a.type)}</span>
            {a.default && (
              <Chip
                size="small"
                severity="info"
              >
                default
              </Chip>
            )}
          </Flex>
        ),
      }),
      agentColumnHelper.accessor((a) => a.adapterName, {
        id: 'adapter',
        header: 'Adapter',
        cell: ({ row: { original: a } }) => (
          <StackedText
            first={a.adapterName ?? '—'}
            second={a.adapterVersion}
          />
        ),
      }),
      agentColumnHelper.accessor((a) => a.protocolVersion, {
        id: 'protocol',
        header: 'ACP',
        cell: ({ row: { original: a } }) =>
          `v${a.protocolVersion ?? '?'}${a.acpV2 ? ' (v2 requested)' : ''}`,
      }),
      agentColumnHelper.accessor((a) => a.models, {
        id: 'models',
        header: 'Models',
        cell: ({ row: { original: a } }) => {
          const models = modelsOf(a)
          return (
            <Flex
              gap="xxsmall"
              wrap="wrap"
            >
              {models.slice(0, 4).map((m) => (
                <Chip
                  key={m.id}
                  size="small"
                  severity={m.id === a.defaultModel ? 'info' : 'neutral'}
                >
                  {m.name}
                </Chip>
              ))}
              {models.length > 4 && (
                <Chip size="small">+{models.length - 4}</Chip>
              )}
              {a.modelSwitchable === false && (
                <Chip
                  size="small"
                  severity="warning"
                  tooltip="The model is fixed at boot and can't be changed mid-thread"
                >
                  fixed model
                </Chip>
              )}
            </Flex>
          )
        },
      }),
      agentColumnHelper.accessor((a) => a.sessionCapabilities, {
        id: 'caps',
        header: 'Sessions',
        cell: ({ row: { original: a } }) => {
          const caps = a.sessionCapabilities ?? {}
          const names = (
            ['list', 'resume', 'load', 'close', 'delete', 'fork'] as const
          ).filter((k) => caps[k])
          return names.length ? names.join(', ') : 'new only'
        },
      }),
      agentColumnHelper.accessor((a) => a.probeStatus, {
        id: 'probe',
        header: 'Probe',
        cell: ({ row: { original: a } }) => (
          <DevboxProbeChip
            status={a.probeStatus}
            error={a.probeError}
          />
        ),
      }),
    ],
    []
  )

  return (
    <Table
      fullHeightWrap
      data={(agents ?? []).filter(isNonNullable)}
      columns={columns}
      emptyStateProps={{ message: 'No agents declared' }}
    />
  )
}

function DevboxPolicies({ box }: { box: DevboxFragment }) {
  const repos = (box.allowedRepositories ?? []).filter(isNonNullable)
  const hosts = (box.httpAllowlist ?? []).filter(isNonNullable)
  const scms = (box.scmConnections ?? []).filter(isNonNullable)
  const idle = box.idlePolicy
  const mins = (s: Nullable<number>) =>
    s ? `${Math.round(s / 60)} min` : 'default'
  return (
    <PolicyGridSC>
      <Card css={{ padding: 16 }}>
        <Body2BoldP>Allowed repositories</Body2BoldP>
        <ListSC>
          {repos.length ? (
            repos.map((r) => <li key={r}>{r}</li>)
          ) : (
            <li>Any repository the SCM connections can reach</li>
          )}
        </ListSC>
        <Body2BoldP css={{ marginTop: 8 }}>SCM connections</Body2BoldP>
        <ListSC>
          {scms.length ? (
            scms.map((s) => (
              <li key={s.id}>
                {s.name} ({s.type?.toLowerCase()})
              </li>
            ))
          ) : (
            <li>None</li>
          )}
        </ListSC>
      </Card>
      <Card css={{ padding: 16 }}>
        <Body2BoldP>HTTP allowlist</Body2BoldP>
        <ListSC>
          {hosts.length ? (
            hosts.map((h) => (
              <li key={`${h.host}:${h.port ?? ''}`}>
                {h.host}
                {h.port ? `:${h.port}` : ''}
                {h.passthrough ? ' (TLS passthrough)' : ''}
              </li>
            ))
          ) : (
            <li>SCM hosts, the AI proxy and console only</li>
          )}
        </ListSC>
      </Card>
      <Card css={{ padding: 16 }}>
        <Body2BoldP>Idle policy</Body2BoldP>
        <ListSC>
          <li>Grace period: {mins(idle?.gracePeriod)}</li>
          <li>Activity window: {mins(idle?.activityWindow)}</li>
          <li>Max keep-awake: {mins(idle?.maxDeferral)}</li>
          <li>Max continuous awake: {mins(idle?.maxContinuousAwake)}</li>
          <li>
            Completes after:{' '}
            {idle?.completeAfter
              ? `${Math.round(idle.completeAfter / 86400)} days suspended`
              : 'default'}
          </li>
        </ListSC>
      </Card>
    </PolicyGridSC>
  )
}

export function DevboxCloudIdentity({
  boxName,
  issuer,
}: {
  boxName: string
  issuer: Nullable<DevboxIssuer>
}) {
  if (!issuer)
    return (
      <Callout
        severity="info"
        title="No workload identity issuer"
      >
        Once this box has a workload identity issuer, its URL and copyable AWS,
        GCP and Azure trust snippets show here. Instances then get short-lived
        cloud credentials without Plural holding any.
      </Callout>
    )

  const snippets = issuer.snippets?.length
    ? serverSnippetGroups(issuer.snippets)
    : devboxTrustSnippets(issuer, boxName).map((s) => ({
        key: s.cloud,
        title: s.label,
        tabs: [
          {
            key: 'terraform',
            label: 'Terraform',
            language: 'hcl',
            content: s.terraform,
          },
          { key: 'cli', label: 'CLI', language: 'sh', content: s.cli },
        ],
      }))
  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Card css={{ padding: 16 }}>
        <PropsGridSC>
          <Prop label="Issuer URL">{issuer.url}</Prop>
          <Prop label="Subject">{issuer.subject}</Prop>
          <Prop label="Audiences">
            {(issuer.audiences ?? []).filter(Boolean).join(', ') ||
              'per cloud identity'}
          </Prop>
        </PropsGridSC>
      </Card>
      {snippets.map((s) => (
        <Code
          key={s.key}
          title={s.title}
          tabs={s.tabs}
        />
      ))}
    </Flex>
  )
}

const CLOUD_TITLES: Record<DevboxCloudProvider, string> = {
  [DevboxCloudProvider.Aws]: 'AWS IAM',
  [DevboxCloudProvider.Gcp]: 'GCP workload identity federation',
  [DevboxCloudProvider.Azure]: 'Azure federated credential',
}

function serverSnippetGroups(snippets: NonNullable<DevboxIssuer['snippets']>) {
  const groups = new Map<DevboxCloudProvider, typeof snippets>()
  for (const s of snippets)
    groups.set(s.provider, [...(groups.get(s.provider) ?? []), s])
  return [...groups.entries()].map(([provider, items]) => ({
    key: provider,
    title: CLOUD_TITLES[provider] ?? provider,
    tabs: items.map((s, i) => ({
      key: `${s.format}-${i}`,
      label: s.title,
      language: s.format === DevboxSnippetFormat.Terraform ? 'hcl' : 'sh',
      content: s.content,
    })),
  }))
}

const PropsGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing.medium,
}))

const PolicyGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: theme.spacing.medium,
}))

const ListSC = styled.ul(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  margin: 0,
  paddingLeft: theme.spacing.medium,
  wordBreak: 'break-all',
}))
