import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchJobFragment,
  WorkbenchJobProgressTinyFragment,
  WorkbenchJobStatus,
} from '../../../../generated/graphql'

export type WorkbenchRunMockEvent =
  | {
      afterMs: number
      type: 'jobDelta'
      payload: WorkbenchJobFragment
    }
  | {
      afterMs: number
      type: 'activityDelta'
      payload: WorkbenchJobActivityFragment
    }
  | {
      afterMs: number
      type: 'progress'
      payload: WorkbenchJobProgressTinyFragment
    }
  | {
      afterMs: number
      type: 'panelState'
      payload: WorkbenchRunMockPanelState | null
    }

export type WorkbenchProgressMap = Record<
  string,
  Array<WorkbenchJobProgressTinyFragment>
>

export interface WorkbenchRunMockScenario {
  initialRun: WorkbenchJobFragment
  events: Array<WorkbenchRunMockEvent>
}

export type WorkbenchRunMockPanelState = 'empty' | 'running' | 'finished'

const RUN_ID = 'mock-run-1'
const WORKBENCH_ID = 'mock-workbench-1'
const INFRA_ACTIVITY_ID = 'mock-activity-infra-1'
const CODING_ACTIVITY_ID = 'mock-activity-coding-1'
const INTEGRATION_ACTIVITY_ID = 'mock-activity-integration-1'
const RESULT_ID = 'mock-result-1'
const LONG_TEXT_SUFFIX =
  'Keep this item expanded in the UI to verify long multiline descriptions scroll inside the panel and do not stretch the full page container.'

const LONG_WORKING_THEORY = `
### Drift analysis summary

We can confidently move forward with controlled remediation, but only if we preserve backward compatibility for legacy module inputs and keep integration updates behind a strict sequencing boundary.

1. The inventory snapshot is stable across regions and environments.
2. The patch strategy is valid when translated through compatibility mappings.
3. Integration sync should remain blocked until codegen validation passes.

#### Risk controls

- Run targeted plans in preview environments first.
- Gate merge on template verification and smoke checks.
- Resume external integration writes only after the schema transition is confirmed.

#### Validation checklist

- Confirm no destructive infra actions are present.
- Confirm all generated templates resolve legacy input aliases.
- Confirm failed integration work can be replayed idempotently.

${LONG_TEXT_SUFFIX}
`.trim()

const LONG_CONCLUSION = `
### Run outcome

The infrastructure discovery stage succeeded, but the coding stage failed on a schema mismatch between legacy and current module inputs. Integration jobs were cancelled intentionally to avoid applying metadata updates against an unverified code state.

#### Required follow-ups

1. Add and test the compatibility shim.
2. Re-run code generation with strict validation enabled.
3. Replay integration sync once coding is green.
4. Publish a post-run report with clear rollback notes.

${LONG_TEXT_SUFFIX}
`.trim()

function makeResultTodo({
  name,
  description,
  done,
}: {
  name: string
  description: string
  done: boolean
}) {
  return {
    __typename: 'WorkbenchJobResultTodo' as const,
    name,
    description,
    done,
  }
}

const TODO_TEMPLATES = [
  {
    name: 'Collect infrastructure inventory',
    description:
      'Scan buckets, databases, and lambdas for drift signals across all managed environments.',
  },
  {
    name: 'Generate module compatibility shim',
    description:
      'Map legacy module inputs before applying IaC patch and validate generated outputs.',
  },
  {
    name: 'Sync Grafana and Sentry metadata',
    description:
      'Update integration mappings after coding completes and replay pending sync tasks.',
  },
  {
    name: 'Verify preview plan results',
    description:
      'Compare expected and actual plan output for each affected service module.',
  },
  {
    name: 'Re-run policy checks',
    description:
      'Execute policy and lint checks against generated templates and manifests.',
  },
  {
    name: 'Prepare rollback notes',
    description:
      'Document fallback path and expected blast radius for each change group.',
  },
  {
    name: 'Capture release handoff',
    description:
      'Publish decision log, run summary, and blockers for the next engineering shift.',
  },
  {
    name: 'Confirm ownership routing',
    description:
      'Ensure failed modules map to the correct owning teams before retry.',
  },
  {
    name: 'Retry failed integration actions',
    description:
      'Resume cancelled integration updates only after code generation passes.',
  },
  {
    name: 'Archive run artifacts',
    description:
      'Store logs, metrics, and diffs for compliance and incident follow-up.',
  },
] as const

function makeTodos(doneNames: Array<string>) {
  return TODO_TEMPLATES.map((todo) =>
    makeResultTodo({
      name: todo.name,
      description: `${todo.description} ${LONG_TEXT_SUFFIX}`,
      done: doneNames.includes(todo.name),
    })
  )
}

const TODOS_PENDING = makeTodos([])
const TODOS_AFTER_INFRA = makeTodos([
  'Collect infrastructure inventory',
  'Generate module compatibility shim',
  'Sync Grafana and Sentry metadata',
])
const TODOS_AFTER_CODING_FAILURE = makeTodos([
  'Collect infrastructure inventory',
  'Generate module compatibility shim',
  'Sync Grafana and Sentry metadata',
  'Verify preview plan results',
  'Re-run policy checks',
  'Prepare rollback notes',
  'Capture release handoff',
])
const TODOS_FINAL_FAILURE = makeTodos([
  'Collect infrastructure inventory',
  'Generate module compatibility shim',
  'Sync Grafana and Sentry metadata',
  'Verify preview plan results',
  'Re-run policy checks',
  'Prepare rollback notes',
  'Capture release handoff',
  'Confirm ownership routing',
  'Retry failed integration actions',
  'Archive run artifacts',
])

const infraActivityPending: WorkbenchJobActivityFragment = {
  __typename: 'WorkbenchJobActivity',
  id: INFRA_ACTIVITY_ID,
  type: WorkbenchJobActivityType.Infrastructure,
  status: WorkbenchJobActivityStatus.Pending,
  prompt:
    'Inspect infrastructure inventory and baseline current drift across all configured clusters, storage services, and compute primitives.',
  insertedAt: '2026-03-18T09:00:00.000Z',
  result: null,
  thoughts: [],
  agentRun: null,
}

const infraActivityRunning: WorkbenchJobActivityFragment = {
  ...infraActivityPending,
  status: WorkbenchJobActivityStatus.Running,
}

const infraActivitySuccessful: WorkbenchJobActivityFragment = {
  ...infraActivityRunning,
  status: WorkbenchJobActivityStatus.Successful,
  result: {
    __typename: 'WorkbenchJobActivityResult',
    output:
      'Fetched s3 buckets, RDS instances, and lambda functions for environment baseline. Generated a normalized inventory snapshot and compared every resource class against expected IaC ownership metadata.',
    jobUpdate: {
      __typename: 'WorkbenchJobActivityJobUpdate',
      diff: null,
      workingTheory:
        'Resource inventory can be updated in place with low operational risk when compatibility translation is applied before writing module-level patches.',
      conclusion: null,
    },
    logs: [
      {
        __typename: 'WorkbenchJobActivityLog',
        timestamp: '2026-03-18T09:00:12.000Z',
        message:
          'Fetched cloud provider inventory and compared against desired configuration.',
        labels: { scope: 'infrastructure' },
      },
      {
        __typename: 'WorkbenchJobActivityLog',
        timestamp: '2026-03-18T09:00:13.000Z',
        message:
          'Detected drift in subnet tagging conventions for two shared VPC modules.',
        labels: { scope: 'infrastructure' },
      },
    ],
    metrics: [
      {
        __typename: 'WorkbenchJobActivityMetric',
        timestamp: '2026-03-18T09:00:14.000Z',
        name: 'resources_scanned',
        value: 63,
        labels: { severity: 'medium' },
      },
      {
        __typename: 'WorkbenchJobActivityMetric',
        timestamp: '2026-03-18T09:00:14.000Z',
        name: 'drift_candidates',
        value: 14,
        labels: { severity: 'high' },
      },
    ],
  },
  thoughts: [
    {
      __typename: 'WorkbenchJobThought',
      id: 'mock-thought-infra-1',
      content:
        'Prefer additive validation steps before proposing destructive infra changes.',
      insertedAt: '2026-03-18T09:00:15.000Z',
      attributes: null,
    },
    {
      __typename: 'WorkbenchJobThought',
      id: 'mock-thought-infra-2',
      content:
        'Drift is mostly naming and ownership metadata; prioritize deterministic transformations before patching.',
      insertedAt: '2026-03-18T09:00:16.000Z',
      attributes: null,
    },
  ],
}

const codingActivityRunning: WorkbenchJobActivityFragment = {
  __typename: 'WorkbenchJobActivity',
  id: CODING_ACTIVITY_ID,
  type: WorkbenchJobActivityType.Coding,
  status: WorkbenchJobActivityStatus.Running,
  prompt:
    'Generate IaC patch and update migration scripts while preserving backward compatibility for legacy module input contracts.',
  insertedAt: '2026-03-18T09:00:20.000Z',
  result: null,
  thoughts: [
    {
      __typename: 'WorkbenchJobThought',
      id: 'mock-thought-coding-1',
      content:
        'Limit changes to module ownership boundaries to reduce review noise.',
      insertedAt: '2026-03-18T09:00:24.000Z',
      attributes: null,
    },
    {
      __typename: 'WorkbenchJobThought',
      id: 'mock-thought-coding-2',
      content:
        'Keep codegen deterministic so repeated runs produce stable diffs for review.',
      insertedAt: '2026-03-18T09:00:26.000Z',
      attributes: null,
    },
  ],
  agentRun: {
    __typename: 'AgentRun',
    id: 'mock-agent-run-1',
    pullRequests: [],
  },
}

const codingActivityFailed: WorkbenchJobActivityFragment = {
  ...codingActivityRunning,
  status: WorkbenchJobActivityStatus.Failed,
  result: {
    __typename: 'WorkbenchJobActivityResult',
    output:
      'Patch generation failed due to schema mismatch in legacy module inputs after compatibility mapping. Generated diff is incomplete and must not be applied.',
    jobUpdate: {
      __typename: 'WorkbenchJobActivityJobUpdate',
      diff: 'diff --git a/modules/network/main.tf b/modules/network/main.tf\n- variable "legacy_subnet"\n+ variable "subnet_config"',
      workingTheory:
        'Module input contracts changed and require compatibility shim before patching; retries should include schema translation and stricter validation.',
      conclusion: null,
    },
    logs: [
      {
        __typename: 'WorkbenchJobActivityLog',
        timestamp: '2026-03-18T09:00:40.000Z',
        message:
          'Template render failed: variable "legacy_subnet" is undefined',
        labels: { scope: 'coding' },
      },
      {
        __typename: 'WorkbenchJobActivityLog',
        timestamp: '2026-03-18T09:00:42.000Z',
        message:
          'Compatibility map was missing fallback for subnet defaults in shared modules.',
        labels: { scope: 'coding' },
      },
    ],
    metrics: [
      {
        __typename: 'WorkbenchJobActivityMetric',
        timestamp: '2026-03-18T09:00:43.000Z',
        name: 'patch_attempts',
        value: 2,
        labels: { language: 'hcl' },
      },
      {
        __typename: 'WorkbenchJobActivityMetric',
        timestamp: '2026-03-18T09:00:43.000Z',
        name: 'render_failures',
        value: 1,
        labels: { language: 'hcl' },
      },
    ],
  },
  agentRun: {
    __typename: 'AgentRun',
    id: 'mock-agent-run-1',
    pullRequests: [
      {
        __typename: 'PullRequest',
        id: 'mock-pr-1',
        url: 'https://github.com/example/infrastructure/pull/42',
        title: 'WIP: Infra migration draft',
        creator: 'plural-agent',
        status: null,
        insertedAt: '2026-03-18T09:00:48.000Z',
        updatedAt: '2026-03-18T09:00:48.000Z',
      },
    ],
  },
}

const integrationActivityPending: WorkbenchJobActivityFragment = {
  __typename: 'WorkbenchJobActivity',
  id: INTEGRATION_ACTIVITY_ID,
  type: WorkbenchJobActivityType.Integration,
  status: WorkbenchJobActivityStatus.Pending,
  prompt:
    'Sync Grafana and Sentry integration metadata, refresh dashboards, and reconcile alert ownership labels.',
  insertedAt: '2026-03-18T09:00:54.000Z',
  result: null,
  thoughts: [],
  agentRun: null,
}

const integrationActivityRunning: WorkbenchJobActivityFragment = {
  ...integrationActivityPending,
  status: WorkbenchJobActivityStatus.Running,
}

const integrationActivityCancelled: WorkbenchJobActivityFragment = {
  ...integrationActivityRunning,
  status: WorkbenchJobActivityStatus.Cancelled,
  result: null,
}

export const MOCK_WORKBENCH_RUN_SCENARIO: WorkbenchRunMockScenario = {
  initialRun: {
    __typename: 'WorkbenchJob',
    id: RUN_ID,
    prompt: 'Audit infra drift, patch IaC, and sync integrations',
    status: WorkbenchJobStatus.Pending,
    insertedAt: '2026-03-18T09:00:00.000Z',
    error: null,
    workbench: {
      __typename: 'Workbench',
      id: WORKBENCH_ID,
      name: 'Infrastructure Reliability',
    },
    activities: {
      __typename: 'WorkbenchJobActivityConnection',
      edges: [],
    },
    result: {
      __typename: 'WorkbenchJobResult',
      id: RESULT_ID,
      workingTheory: null,
      conclusion: null,
      todos: TODOS_PENDING,
      metadata: {
        __typename: 'WorkbenchJobResultMetadata',
        metrics: [],
      },
    },
  },
  events: [
    {
      afterMs: 400,
      type: 'jobDelta',
      payload: {
        __typename: 'WorkbenchJob',
        id: RUN_ID,
        prompt: 'Audit infra drift, patch IaC, and sync integrations',
        status: WorkbenchJobStatus.Running,
        insertedAt: '2026-03-18T09:00:00.000Z',
        error: null,
        workbench: {
          __typename: 'Workbench',
          id: WORKBENCH_ID,
          name: 'Infrastructure Reliability',
        },
        activities: {
          __typename: 'WorkbenchJobActivityConnection',
          edges: [],
        },
        result: {
          __typename: 'WorkbenchJobResult',
          id: RESULT_ID,
          workingTheory: null,
          conclusion: null,
          todos: TODOS_PENDING,
          metadata: {
            __typename: 'WorkbenchJobResultMetadata',
            metrics: [],
          },
        },
      },
    },
    {
      afterMs: 700,
      type: 'activityDelta',
      payload: infraActivityPending,
    },
    {
      afterMs: 900,
      type: 'activityDelta',
      payload: infraActivityRunning,
    },
    {
      afterMs: 1050,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INFRA_ACTIVITY_ID,
        tool: 'inventory',
        text: 'Fetching s3 buckets',
        arguments: { workspace: 'prod', depth: 'full' },
      },
    },
    {
      afterMs: 1220,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INFRA_ACTIVITY_ID,
        tool: 'inventory',
        text: 'Fetching RDS instance',
        arguments: { workspace: 'prod', depth: 'full' },
      },
    },
    {
      afterMs: 1380,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INFRA_ACTIVITY_ID,
        tool: 'inventory',
        text: 'Fetching lambda functions',
        arguments: { workspace: 'prod', depth: 'full' },
      },
    },
    {
      afterMs: 1460,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INFRA_ACTIVITY_ID,
        tool: 'inventory',
        text: 'Comparing resource ownership labels against terraform state',
        arguments: { workspace: 'prod', mode: 'ownership-compare' },
      },
    },
    {
      afterMs: 1520,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INFRA_ACTIVITY_ID,
        tool: 'inventory',
        text: 'Evaluating drift severity buckets and candidate remediation sets',
        arguments: { workspace: 'prod', mode: 'risk-scan' },
      },
    },
    {
      afterMs: 1600,
      type: 'activityDelta',
      payload: infraActivitySuccessful,
    },
    {
      afterMs: 1660,
      type: 'jobDelta',
      payload: {
        __typename: 'WorkbenchJob',
        id: RUN_ID,
        prompt: 'Audit infra drift, patch IaC, and sync integrations',
        status: WorkbenchJobStatus.Running,
        insertedAt: '2026-03-18T09:00:00.000Z',
        error: null,
        workbench: {
          __typename: 'Workbench',
          id: WORKBENCH_ID,
          name: 'Infrastructure Reliability',
        },
        activities: {
          __typename: 'WorkbenchJobActivityConnection',
          edges: [
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: infraActivitySuccessful,
            },
          ],
        },
        result: {
          __typename: 'WorkbenchJobResult',
          id: RESULT_ID,
          workingTheory: LONG_WORKING_THEORY,
          conclusion: null,
          todos: TODOS_AFTER_INFRA,
          metadata: {
            __typename: 'WorkbenchJobResultMetadata',
            metrics: [],
          },
        },
      },
    },
    {
      afterMs: 1720,
      type: 'panelState',
      payload: 'empty',
    },
    {
      afterMs: 1820,
      type: 'panelState',
      payload: null,
    },
    {
      afterMs: 1850,
      type: 'activityDelta',
      payload: codingActivityRunning,
    },
    {
      afterMs: 2100,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: CODING_ACTIVITY_ID,
        tool: 'codegen',
        text: 'Applying compatibility shim for module input changes',
        arguments: { files: ['modules/network/main.tf'] },
      },
    },
    {
      afterMs: 2320,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: CODING_ACTIVITY_ID,
        tool: 'codegen',
        text: 'Running unit checks against generated templates',
        arguments: {
          files: ['modules/network/main.tf', 'modules/iam/main.tf'],
        },
      },
    },
    {
      afterMs: 2420,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: CODING_ACTIVITY_ID,
        tool: 'codegen',
        text: 'Rendering compatibility aliases for legacy network module variables',
        arguments: {
          files: ['modules/network/main.tf', 'modules/network/variables.tf'],
        },
      },
    },
    {
      afterMs: 2520,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: CODING_ACTIVITY_ID,
        tool: 'codegen',
        text: 'Running dry-run template validation and collecting render diagnostics',
        arguments: {
          files: [
            'modules/network/main.tf',
            'modules/iam/main.tf',
            'modules/security/main.tf',
          ],
        },
      },
    },
    {
      afterMs: 2620,
      type: 'activityDelta',
      payload: codingActivityFailed,
    },
    {
      afterMs: 2720,
      type: 'jobDelta',
      payload: {
        __typename: 'WorkbenchJob',
        id: RUN_ID,
        prompt: 'Audit infra drift, patch IaC, and sync integrations',
        status: WorkbenchJobStatus.Running,
        insertedAt: '2026-03-18T09:00:00.000Z',
        error: null,
        workbench: {
          __typename: 'Workbench',
          id: WORKBENCH_ID,
          name: 'Infrastructure Reliability',
        },
        activities: {
          __typename: 'WorkbenchJobActivityConnection',
          edges: [
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: infraActivitySuccessful,
            },
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: codingActivityFailed,
            },
          ],
        },
        result: {
          __typename: 'WorkbenchJobResult',
          id: RESULT_ID,
          workingTheory: LONG_WORKING_THEORY,
          conclusion: null,
          todos: TODOS_AFTER_CODING_FAILURE,
          metadata: {
            __typename: 'WorkbenchJobResultMetadata',
            metrics: [],
          },
        },
      },
    },
    {
      afterMs: 2860,
      type: 'activityDelta',
      payload: integrationActivityPending,
    },
    {
      afterMs: 3040,
      type: 'activityDelta',
      payload: integrationActivityRunning,
    },
    {
      afterMs: 3240,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INTEGRATION_ACTIVITY_ID,
        tool: 'integration',
        text: 'Update Sentry tables',
        arguments: { provider: 'sentry' },
      },
    },
    {
      afterMs: 3380,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INTEGRATION_ACTIVITY_ID,
        tool: 'integration',
        text: 'Fetching Grafana charts',
        arguments: { provider: 'grafana' },
      },
    },
    {
      afterMs: 3460,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INTEGRATION_ACTIVITY_ID,
        tool: 'integration',
        text: 'Reconciling ownership labels for dashboard and alert resources',
        arguments: { provider: 'grafana', mode: 'label-reconcile' },
      },
    },
    {
      afterMs: 3520,
      type: 'progress',
      payload: {
        __typename: 'WorkbenchJobProgress',
        activityId: INTEGRATION_ACTIVITY_ID,
        tool: 'integration',
        text: 'Preparing replay manifest for skipped webhook and metadata updates',
        arguments: { provider: 'sentry', mode: 'replay-prep' },
      },
    },
    {
      afterMs: 3600,
      type: 'activityDelta',
      payload: integrationActivityCancelled,
    },
    {
      afterMs: 3900,
      type: 'jobDelta',
      payload: {
        __typename: 'WorkbenchJob',
        id: RUN_ID,
        prompt: 'Audit infra drift, patch IaC, and sync integrations',
        status: WorkbenchJobStatus.Failed,
        insertedAt: '2026-03-18T09:00:00.000Z',
        error: 'One or more activities did not complete successfully.',
        workbench: {
          __typename: 'Workbench',
          id: WORKBENCH_ID,
          name: 'Infrastructure Reliability',
        },
        activities: {
          __typename: 'WorkbenchJobActivityConnection',
          edges: [
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: infraActivitySuccessful,
            },
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: codingActivityFailed,
            },
            {
              __typename: 'WorkbenchJobActivityEdge',
              node: integrationActivityCancelled,
            },
          ],
        },
        result: {
          __typename: 'WorkbenchJobResult',
          id: RESULT_ID,
          workingTheory: LONG_WORKING_THEORY,
          conclusion: LONG_CONCLUSION,
          todos: TODOS_FINAL_FAILURE,
          metadata: {
            __typename: 'WorkbenchJobResultMetadata',
            metrics: [
              {
                __typename: 'WorkbenchJobActivityMetric',
                timestamp: '2026-03-18T09:00:49.000Z',
                name: 'activities_completed',
                value: 1,
                labels: { scope: 'job' },
              },
              {
                __typename: 'WorkbenchJobActivityMetric',
                timestamp: '2026-03-18T09:00:49.000Z',
                name: 'activities_failed',
                value: 1,
                labels: { scope: 'job' },
              },
              {
                __typename: 'WorkbenchJobActivityMetric',
                timestamp: '2026-03-18T09:00:49.000Z',
                name: 'activities_cancelled',
                value: 1,
                labels: { scope: 'job' },
              },
            ],
          },
        },
      },
    },
  ],
}

export interface WorkbenchRunMockState {
  run: WorkbenchJobFragment | null
  progressByActivityId: WorkbenchProgressMap
  panelStateOverride: WorkbenchRunMockPanelState | null
}

function toEdge(
  activity: WorkbenchJobActivityFragment
): NonNullable<
  NonNullable<WorkbenchJobFragment['activities']>['edges']
>[number] {
  return {
    __typename: 'WorkbenchJobActivityEdge',
    node: activity,
  }
}

function upsertActivityInRun(
  run: WorkbenchJobFragment | null,
  activity: WorkbenchJobActivityFragment
): WorkbenchJobFragment | null {
  if (!run) return run

  const previousEdges = run.activities?.edges ?? []
  const updatedEdges = [...previousEdges]
  const index = updatedEdges.findIndex((edge) => edge?.node?.id === activity.id)

  if (index >= 0) {
    updatedEdges[index] = toEdge(activity)
  } else {
    updatedEdges.push(toEdge(activity))
  }

  return {
    ...run,
    activities: {
      __typename: 'WorkbenchJobActivityConnection',
      edges: updatedEdges,
    },
  }
}

function appendProgressEvent(
  progressByActivityId: WorkbenchProgressMap,
  progress: WorkbenchJobProgressTinyFragment
): WorkbenchProgressMap {
  const current = progressByActivityId[progress.activityId] ?? []
  const alreadyExists = current.some(
    (event) =>
      event.text === progress.text &&
      event.tool === progress.tool &&
      JSON.stringify(event.arguments ?? {}) ===
        JSON.stringify(progress.arguments ?? {})
  )

  if (alreadyExists) return progressByActivityId

  return {
    ...progressByActivityId,
    [progress.activityId]: [...current, progress],
  }
}

export function applyWorkbenchRunMockEvent(
  state: WorkbenchRunMockState,
  event: WorkbenchRunMockEvent
): WorkbenchRunMockState {
  if (event.type === 'jobDelta') {
    return {
      ...state,
      run: event.payload,
    }
  }

  if (event.type === 'activityDelta') {
    return {
      ...state,
      run: upsertActivityInRun(state.run, event.payload),
    }
  }

  if (event.type === 'panelState') {
    return {
      ...state,
      panelStateOverride: event.payload,
    }
  }

  return {
    ...state,
    progressByActivityId: appendProgressEvent(
      state.progressByActivityId,
      event.payload
    ),
  }
}

export type WorkbenchRunMockSubscriber = (
  event: WorkbenchRunMockEvent,
  nextState: WorkbenchRunMockState
) => void

export interface WorkbenchRunMockFeeder {
  getState: () => WorkbenchRunMockState
  reset: () => void
  start: () => void
  stop: () => void
  subscribe: (handler: WorkbenchRunMockSubscriber) => () => void
}

export function createWorkbenchRunMockFeeder({
  scenario = MOCK_WORKBENCH_RUN_SCENARIO,
  speed = 1,
  loop = false,
}: {
  scenario?: WorkbenchRunMockScenario
  speed?: number
  loop?: boolean
} = {}): WorkbenchRunMockFeeder {
  let state: WorkbenchRunMockState = {
    run: scenario.initialRun,
    progressByActivityId: {},
    panelStateOverride: null,
  }
  let timers: Array<ReturnType<typeof setTimeout>> = []
  const subscribers = new Set<WorkbenchRunMockSubscriber>()

  const emit = (event: WorkbenchRunMockEvent) => {
    state = applyWorkbenchRunMockEvent(state, event)
    subscribers.forEach((handler) => handler(event, state))
  }

  const schedule = () => {
    scenario.events.forEach((event) => {
      const timer = setTimeout(
        () => emit(event),
        Math.max(0, Math.floor(event.afterMs / Math.max(speed, 0.01)))
      )
      timers.push(timer)
    })

    if (loop && scenario.events.length > 0) {
      const cycleMs = scenario.events[scenario.events.length - 1].afterMs
      const loopTimer = setTimeout(
        () => {
          state = {
            run: scenario.initialRun,
            progressByActivityId: {},
            panelStateOverride: null,
          }
          schedule()
        },
        Math.max(0, Math.floor(cycleMs / Math.max(speed, 0.01))) + 1
      )
      timers.push(loopTimer)
    }
  }

  return {
    getState: () => state,
    reset: () => {
      state = {
        run: scenario.initialRun,
        progressByActivityId: {},
        panelStateOverride: null,
      }
    },
    start: () => {
      timers.forEach(clearTimeout)
      timers = []
      schedule()
    },
    stop: () => {
      timers.forEach(clearTimeout)
      timers = []
    },
    subscribe: (handler) => {
      subscribers.add(handler)
      return () => subscribers.delete(handler)
    },
  }
}
