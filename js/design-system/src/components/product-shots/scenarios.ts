export type ProductShotFidelity = 'abstract' | 'chrome' | 'surface'
export type ProductShotTheme = 'light' | 'dark'

export type ProductShotBlock =
  | { type: 'prompt'; text: string; action: string }
  | { type: 'progress'; label: string; items: string[] }
  | { type: 'issues'; items: { label: string; severity: string }[] }
  | { type: 'diff'; file: string; removed: string; added: string; action: string }
  | { type: 'ticket'; id: string; title: string; source: string }
  | { type: 'code'; file: string; lines: string[] }
  | { type: 'sql'; query: string; rows: string[][] }
  | { type: 'chart'; label: string; value: string; detail: string }
  | { type: 'alert'; title: string; detail: string }
  | { type: 'connections'; center: string; nodes: string[] }

export type ProductShotStep = {
  id: string
  title: string
  fidelity: ProductShotFidelity
  blocks: ProductShotBlock[]
}

export type ProductShotScenario = {
  id: string
  title: string
  steps: ProductShotStep[]
}

export const productShotScenarios = {
  'environment-hygiene': {
    id: 'environment-hygiene',
    title: 'Environment hygiene',
    steps: [
      {
        id: 'dispatch',
        title: 'Dispatch environment hygiene agent',
        fidelity: 'chrome',
        blocks: [
          {
            type: 'prompt',
            text: 'Find drift, stale dependencies, and risky configuration across production.',
            action: 'Start hygiene scan',
          },
        ],
      },
      {
        id: 'search',
        title: 'Search repos and infra for context',
        fidelity: 'surface',
        blocks: [
          {
            type: 'progress',
            label: 'Gathering infrastructure context',
            items: ['Scanning 24 repositories', 'Reading cluster state', 'Checking deployment history'],
          },
        ],
      },
      {
        id: 'prioritize',
        title: 'Prioritize and assign fixes',
        fidelity: 'surface',
        blocks: [
          {
            type: 'issues',
            items: [
              { label: 'Ingress controller is 3 versions behind', severity: 'High' },
              { label: 'Unused node pool in staging', severity: 'Savings' },
              { label: 'Workload missing resource limits', severity: 'Medium' },
            ],
          },
        ],
      },
      {
        id: 'open-pr',
        title: 'Write fix, open PR',
        fidelity: 'surface',
        blocks: [
          {
            type: 'diff',
            file: 'clusters/prod/ingress.yaml',
            removed: 'version: 1.9.6',
            added: 'version: 1.12.0',
            action: 'Open pull request',
          },
        ],
      },
    ],
  },
  'backlog-execution': {
    id: 'backlog-execution',
    title: 'Backlog execution',
    steps: [
      {
        id: 'ticket',
        title: 'Receive ticket',
        fidelity: 'chrome',
        blocks: [{ type: 'ticket', id: 'PLRL-4821', title: 'Add runtime getting-started guide', source: 'Linear' }],
      },
      {
        id: 'context',
        title: 'Gather context across repos, IaC, and runtime',
        fidelity: 'surface',
        blocks: [
          {
            type: 'progress',
            label: 'Building task context',
            items: ['Found documentation conventions', 'Read runtime configuration', 'Mapped related pages'],
          },
        ],
      },
      {
        id: 'draft',
        title: 'Draft changes',
        fidelity: 'surface',
        blocks: [
          {
            type: 'code',
            file: 'runtime/getting-started.md',
            lines: ['# Get started with Runtime', '## Install the agent', 'plural runtime deploy --cluster prod'],
          },
        ],
      },
      {
        id: 'open-pr',
        title: 'Open PR',
        fidelity: 'surface',
        blocks: [
          {
            type: 'diff',
            file: 'docs/runtime/getting-started.md',
            removed: '0 files changed',
            added: '1 file · 84 additions',
            action: 'Create PR',
          },
        ],
      },
    ],
  },
  'cost-analysis': {
    id: 'cost-analysis',
    title: 'Cost analysis & optimization',
    steps: [
      {
        id: 'prompt',
        title: 'Give a task to Plural AI',
        fidelity: 'chrome',
        blocks: [
          {
            type: 'prompt',
            text: 'Break down EKS spend and find safe right-sizing opportunities.',
            action: 'Run analysis',
          },
        ],
      },
      {
        id: 'query',
        title: 'Query spend data',
        fidelity: 'surface',
        blocks: [
          {
            type: 'sql',
            query: 'SELECT cluster, SUM(cost) FROM usage GROUP BY cluster',
            rows: [['prod-us', '$18,420'], ['staging', '$6,180'], ['dev', '$2,940']],
          },
        ],
      },
      {
        id: 'breakdown',
        title: 'Break down cost by cluster and workload',
        fidelity: 'surface',
        blocks: [{ type: 'chart', label: 'Monthly compute spend', value: '$27.5k', detail: '20% lower after right-sizing' }],
      },
      {
        id: 'right-size',
        title: 'Surface waste and open PRs',
        fidelity: 'surface',
        blocks: [
          {
            type: 'diff',
            file: 'apps/payments/resources.yaml',
            removed: 'cpu: 1000m',
            added: 'cpu: 400m',
            action: 'Open 3 PRs',
          },
        ],
      },
    ],
  },
  'incident-response': {
    id: 'incident-response',
    title: 'Incident response',
    steps: [
      {
        id: 'alert',
        title: 'Receive alert',
        fidelity: 'chrome',
        blocks: [{ type: 'alert', title: 'p95 latency over 2s', detail: 'payments-api · prod-us-east · 3m ago' }],
      },
      {
        id: 'query',
        title: 'Query logs, metrics, and traces',
        fidelity: 'surface',
        blocks: [
          {
            type: 'code',
            file: 'payments-api / live logs',
            lines: ['02:40:45  GET /checkout  503', '02:40:45  pool exhausted', '02:40:46  retry 3/3 failed'],
          },
        ],
      },
      {
        id: 'cluster',
        title: 'Check cluster state',
        fidelity: 'surface',
        blocks: [{ type: 'chart', label: 'Database connections', value: '955', detail: 'Limit: 1,000 · 96% utilized' }],
      },
      {
        id: 'open-pr',
        title: 'Write fix, open PR',
        fidelity: 'surface',
        blocks: [
          {
            type: 'diff',
            file: 'payments/deployment.yaml',
            removed: 'DB_POOL_SIZE: 20',
            added: 'DB_POOL_SIZE: 60',
            action: 'Open fix PR',
          },
        ],
      },
    ],
  },
} as const satisfies Record<string, ProductShotScenario>

export type ProductShotScenarioId = keyof typeof productShotScenarios
