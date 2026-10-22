export type ProductShotFidelity = 'abstract' | 'chrome' | 'surface'
export type ProductShotTheme = 'light' | 'dark'
export type ProductShotNav = 'workbench' | 'ticket' | 'cost' | 'alerts'

export type ProductShotLogo =
  | 'openai'
  | 'claude'
  | 'datadog'
  | 'grafana'
  | 'prometheus'
  | 'jira'
  | 'linear'
  | 'gitlab'
  | 'github'
  | 'elastic'
  | 'plural'

// Strings support `inline code` spans wrapped in backticks.
export type ProductShotTableCell =
  | string
  | { severity: 'critical' | 'warning'; label: string }

export type ProductShotHighlightPart =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'facts'; items: { label: string; value: string }[] }
  | {
      type: 'stats'
      items: {
        icon: 'stateful' | 'memory' | 'cpu'
        label: string
        value: string
      }[]
    }
  | { type: 'table'; columns: string[]; rows: ProductShotTableCell[][] }

export type ProductShotMeta = {
  label: string
  value: string
  chip?: 'progress' | 'firing' | 'plain'
  logo?: ProductShotLogo
}

export type ProductShotBlock =
  | {
      type: 'connection'
      label: string
      rows: {
        label: string
        value?: string
        logos: ProductShotLogo[]
        more?: string
      }[]
      action: string
    }
  | { type: 'agent'; title: string; subtitle: string }
  | {
      type: 'todos'
      title: string
      items: { label: string; detail?: string; done?: boolean }[]
    }
  | { type: 'highlight'; title: string; parts: ProductShotHighlightPart[] }
  | {
      type: 'pullRequests'
      title: string
      items: { path: string; description: string }[]
    }
  | { type: 'code'; language: 'HCL' | 'YAML'; lines: string[] }
  | {
      type: 'diff'
      file: string
      summary: string
      left: { text: string; removed?: boolean }[]
      right: { text: string; added?: boolean }[]
    }
  | {
      type: 'record'
      icon: 'ticket' | 'alert'
      title: string
      url: string
      description: string
      meta: ProductShotMeta[]
    }
  | {
      type: 'ticket'
      id: string
      title: string
      body: string
      meta: ProductShotMeta[]
    }
  | {
      type: 'integration'
      label: string
      integration: { logo: ProductShotLogo; name: string }
      fields: string[]
      options: { name: string; initials?: string; plural?: boolean }[]
      more: string
    }
  | {
      type: 'chat'
      messages: { from: 'user' | 'plural'; initials?: string; text: string }[]
      placeholder: string
      model: { logo: ProductShotLogo; name: string }
    }
  | {
      type: 'report'
      title: string
      facts: { label: string; value: string }[]
      stat: { label: string; value: string; delta: string }
    }
  | {
      type: 'bars'
      title: string
      items: { label: string; value: string; percent: number }[]
    }
  | { type: 'lineChart'; title: string; ranges: string[]; caption: string }
  | { type: 'areaChart'; title: string; labels: string[] }
  | {
      type: 'logs'
      title: string
      subtitle: string
      lines: { text: string; marker?: 'info' | 'error' }[]
    }

export type ProductShotCard = {
  x: number
  y: number
  width: number
  // Outer cards are the elevated glow surfaces; plain cards sit directly on the canvas.
  variant?: 'outer' | 'plain'
  blocks: ProductShotBlock[]
}

export type ProductShotStep = {
  id: string
  title: string
  fidelity: ProductShotFidelity
  cards: ProductShotCard[]
  cursor?: { x: number; y: number }
}

export type ProductShotScenario = {
  id: string
  title: string
  nav: ProductShotNav
  steps: ProductShotStep[]
}

const pullRequestPath = '/pluralsh/console/pull/1913'

const todoCard = (
  subtitle: string,
  items: { label: string; detail?: string; done?: boolean }[]
): ProductShotCard[] => [
  {
    x: 244,
    y: 131,
    width: 448,
    blocks: [
      { type: 'agent', title: 'Started background agent', subtitle },
      { type: 'todos', title: 'Agent todos', items },
    ],
  },
]

export const productShotScenarios = {
  'environment-hygiene': {
    id: 'environment-hygiene',
    title: 'Environment hygiene',
    nav: 'workbench',
    steps: [
      {
        id: 'dispatch',
        title: 'Dispatch environment hygiene agent',
        fidelity: 'surface',
        cards: [
          {
            x: 204,
            y: 164,
            width: 511,
            blocks: [
              {
                type: 'connection',
                label: 'Workbench connection',
                rows: [
                  { label: 'coding agent', value: 'codex', logos: ['openai'] },
                  {
                    label: 'webhooks',
                    logos: ['datadog', 'grafana', 'prometheus'],
                  },
                  {
                    label: 'bound tools',
                    logos: ['linear', 'elastic', 'gitlab', 'github'],
                    more: '+5',
                  },
                ],
                action: 'Search anything broken in alerts and infra state',
              },
            ],
          },
        ],
      },
      {
        id: 'search',
        title: 'Search repos and infra for context',
        fidelity: 'surface',
        cards: todoCard(
          'Investigation of alerting and infrastructure state across the fleet',
          [
            {
              label: 'Check pods not running',
              detail: 'Pods in CrashLoopBackOff, Error, OOMKilled, Pending',
              done: true,
            },
            {
              label: 'Check deployments/StatefulSets with unavailable replicas',
            },
            { label: 'Check Ingresses with issues' },
          ]
        ),
      },
      {
        id: 'prioritize',
        title: 'Prioritize and assign fixes',
        fidelity: 'surface',
        cards: [
          {
            x: 238,
            y: 143,
            width: 449,
            blocks: [
              {
                type: 'highlight',
                title: 'What was found',
                parts: [
                  {
                    type: 'text',
                    text: '2 critical issues found · 2 warnings',
                  },
                  {
                    type: 'table',
                    columns: ['Severity', 'Issue'],
                    rows: [
                      [
                        { severity: 'critical', label: 'critical' },
                        'nginx-test ImagePullBackOff (`24.1.0` bad tag)',
                      ],
                      [
                        { severity: 'critical', label: 'critical' },
                        'nginx-test-2 Unschedulable (`100Gi` memory req)',
                      ],
                      [
                        { severity: 'warning', label: 'warning' },
                        'ingress-nginx HPA broken — no metrics-server (3 clusters)',
                      ],
                      [
                        { severity: 'warning', label: 'warning' },
                        'Trivy scan OOMKilling on gke-fleet-prod',
                      ],
                    ],
                  },
                  { type: 'heading', text: 'Trivy OOMKill - `gke-fleet-prod`' },
                  {
                    type: 'bullets',
                    items: [
                      'scan job resource limits too low',
                      'jobs failing mid-scan',
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'open-pr',
        title: 'Write fix, open PR',
        fidelity: 'surface',
        cursor: { x: 632, y: 508 },
        cards: [
          {
            x: 188,
            y: 95,
            width: 519,
            blocks: [
              {
                type: 'highlight',
                title: 'Recommended PRs',
                parts: [
                  {
                    type: 'table',
                    columns: ['PR', 'Change'],
                    rows: [
                      ['PR 1', 'Fix `image.tag: 24.1.0` → `1.27.0`'],
                      ['PR 2', 'Fix `memory: 100Gi` → `256Mi`'],
                      [
                        'PR 3',
                        'Add `metrics-server` or switch HPA to CPU-only',
                      ],
                    ],
                  },
                ],
              },
              {
                type: 'pullRequests',
                title: 'Pull requests',
                items: [
                  {
                    path: '/pluralsh/console/pull/1913',
                    description:
                      'Correct invalid nginx image tag and unreasonable memory request',
                  },
                  {
                    path: '/pluralsh/console/pull/1914',
                    description:
                      'Make /ping endpoint deterministic (remove time-based failure)',
                  },
                  {
                    path: '/pluralsh/console/pull/1915',
                    description:
                      'Add metrics-server dependency or switch HPA to CPU-only',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  'backlog-execution': {
    id: 'backlog-execution',
    title: 'Backlog execution',
    nav: 'ticket',
    steps: [
      {
        id: 'ticket',
        title: 'Receive ticket',
        fidelity: 'surface',
        cursor: { x: 664, y: 302 },
        cards: [
          {
            x: 159,
            y: 256,
            width: 354,
            blocks: [
              {
                type: 'ticket',
                id: 'plr-demo-ticket-9201',
                title: 'Double the size of the grafana database',
                body: "You've been assigned the following issue from Jira. Investigate everything necessary to complete the task",
                meta: [
                  { label: 'Creator', value: 'Jake Laderman' },
                  { label: 'Status', value: 'In progress', chip: 'progress' },
                  { label: 'Provider', value: 'Jira', logo: 'jira' },
                ],
              },
            ],
          },
          {
            x: 400,
            y: 138,
            width: 341,
            blocks: [
              {
                type: 'integration',
                label: 'Integration',
                integration: { logo: 'jira', name: 'Jira backlog' },
                fields: ['Assignee:', 'Reporter: Mia', 'Due date: Jun 12'],
                options: [
                  { name: 'Plural AI', plural: true },
                  { name: 'Paul Rigatoni', initials: 'PR' },
                  { name: 'Kim Song', initials: 'KS' },
                ],
                more: 'Show 9 more',
              },
            ],
          },
        ],
      },
      {
        id: 'context',
        title: 'Gather context across repos, IaC, and runtime',
        fidelity: 'surface',
        cards: todoCard('Ticket created by Jake at 3:24PM', [
          {
            label: 'User wants to double size of database',
            detail: 'Need to find the current Grafana database config',
            done: true,
          },
          { label: 'Determine the current size' },
          { label: 'Make GitOps change to double it' },
        ]),
      },
      {
        id: 'draft',
        title: 'Draft changes',
        fidelity: 'surface',
        cards: [
          {
            x: 212,
            y: 146,
            width: 448,
            blocks: [
              {
                type: 'highlight',
                title: 'What was found',
                parts: [
                  {
                    type: 'bullets',
                    items: [
                      'Grafana uses an external PostgreSQL RDS instance (not a PVC)',
                      'Managed by Plural Stack via terraform/apps/grafana',
                    ],
                  },
                  {
                    type: 'text',
                    text: 'Notes: RDS gp2 storage scale-up is online and non-disruptive, but irreversible (cannot shrink back)',
                  },
                ],
              },
              {
                type: 'code',
                language: 'HCL',
                lines: [
                  '# Before',
                  'variable "db_storage" { default = 40 }',
                  '',
                  '# After',
                  'variable "db_storage" { default = 80 }',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'open-pr',
        title: 'Open PR',
        fidelity: 'surface',
        cursor: { x: 626, y: 424 },
        cards: [
          {
            x: 230,
            y: 152,
            width: 494,
            blocks: [
              {
                type: 'record',
                icon: 'ticket',
                title: 'Issue',
                url: 'atlassian.net/pluralsh/issue/PROD-4430/workbench-job-execution',
                description:
                  'double grafana db storage from 40GB to 80GB for me',
                meta: [
                  { label: 'Date', value: '3/9/2026 3:24pm' },
                  { label: 'Creator', value: 'Jake Laderman' },
                  { label: 'Status', value: 'In progress', chip: 'progress' },
                  { label: 'Provider', value: 'Jira', logo: 'jira' },
                ],
              },
              {
                type: 'pullRequests',
                title: 'Pull request',
                items: [
                  {
                    path: pullRequestPath,
                    description:
                      'Increase grafana RDS storage from 40GB to 80GB',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  'cost-analysis': {
    id: 'cost-analysis',
    title: 'Cost analysis & optimization',
    nav: 'cost',
    steps: [
      {
        id: 'prompt',
        title: 'Give a task to Plural AI',
        fidelity: 'surface',
        cards: [
          {
            x: 258,
            y: 236,
            width: 357,
            blocks: [
              {
                type: 'chat',
                messages: [
                  {
                    from: 'user',
                    initials: 'KS',
                    text: 'Generate a cost report for all eks clusters, recommend cost savings',
                  },
                  { from: 'plural', text: 'Fetching AWS cluster price sheets' },
                ],
                placeholder: 'Use @ to mention clusters, services and stacks',
                model: { logo: 'claude', name: 'Claude' },
              },
            ],
          },
        ],
      },
      {
        id: 'query',
        title: 'Query spend data',
        fidelity: 'surface',
        cards: todoCard('EKS Cost Estimation agent', [
          {
            label: 'Gathering EKS cluster inventory',
            detail: 'Enumerate all live EKS clusters from AWS infrastructure',
            done: true,
          },
          { label: "Classify each cluster's support tier" },
          { label: 'Build a dashboard' },
        ]),
      },
      {
        id: 'breakdown',
        title: 'Break down cost by cluster and workload',
        fidelity: 'surface',
        cards: [
          {
            x: 255,
            y: 65,
            width: 378,
            blocks: [
              {
                type: 'report',
                title: 'EKS monthly report',
                facts: [
                  { label: 'Fleet total', value: '~$7,786/mo' },
                  { label: 'Support Uplift', value: '$7,342.49' },
                  { label: 'Region', value: 'us-east-2' },
                ],
                stat: {
                  label: 'Total cost',
                  value: '$583.23',
                  delta: '20% since last week',
                },
              },
              {
                type: 'bars',
                title: 'Fleet monthly cost by category ($)',
                items: [
                  { label: 'EC2 Worker Nodes', value: '4615.94', percent: 88 },
                  { label: 'EKS control plane', value: '1971', percent: 66 },
                  { label: 'NAT gateways', value: '955.5', percent: 78 },
                  { label: 'NLBs', value: '213.53', percent: 60 },
                ],
              },
              {
                type: 'lineChart',
                title: 'Average cost',
                ranges: ['1D', '1M', '1Y', 'Max'],
                caption: 'Average daily cost per cluster over time.',
              },
            ],
          },
        ],
      },
      {
        id: 'right-size',
        title: 'Surface waste and open PRs',
        fidelity: 'surface',
        cursor: { x: 672, y: 478 },
        cards: [
          {
            x: 238,
            y: 102,
            width: 518,
            blocks: [
              {
                type: 'highlight',
                title: 'Recommendation',
                parts: [
                  {
                    type: 'stats',
                    items: [
                      {
                        icon: 'stateful',
                        label: 'elastic > logstash-ls',
                        value: 'stateful',
                      },
                      {
                        icon: 'memory',
                        label: 'Memory change',
                        value: '2.15Gi → 2.57Gi',
                      },
                      {
                        icon: 'cpu',
                        label: 'CPU change',
                        value: '1000m → 40m',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'code',
                language: 'YAML',
                lines: [
                  'resources:',
                  '  requests:',
                  '    memory: 2.57Gi',
                  '    cpu: 40m',
                ],
              },
              {
                type: 'pullRequests',
                title: 'Pull request',
                items: [
                  {
                    path: pullRequestPath,
                    description: 'Updated memory from 2.15Gi → 2.57Gi',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  'incident-response': {
    id: 'incident-response',
    title: 'Incident response',
    nav: 'alerts',
    steps: [
      {
        id: 'alert',
        title: 'Receive alert',
        fidelity: 'surface',
        cards: [
          {
            x: 230,
            y: 166,
            width: 494,
            blocks: [
              {
                type: 'record',
                icon: 'alert',
                title: 'Alerts',
                url: 'alerting/grafana/aeu0mdt3z32tce/view?orgId=1',
                description: 'HTTP500Errors',
                meta: [
                  { label: 'Date', value: '3/9/2026 3:24pm' },
                  { label: 'Severity', value: 'Undefined', chip: 'plain' },
                  { label: 'Status', value: 'Firing', chip: 'firing' },
                  { label: 'Provider', value: 'Grafana', logo: 'grafana' },
                ],
              },
            ],
          },
          {
            x: 183,
            y: 363,
            width: 397,
            variant: 'plain',
            blocks: [
              {
                type: 'highlight',
                title: 'Found the following alert',
                parts: [
                  {
                    type: 'text',
                    text: 'This alert was caused by a real application bug, not Kubernetes instability or a metrics artifact.',
                  },
                  {
                    type: 'text',
                    text: '`/ping` in flow-test was raising Exception("unknown internal error") on a time-based cadence, producing intermittent HTTP 500 responses while the pod itself remained healthy.',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'query',
        title: 'Query logs, metrics, and traces',
        fidelity: 'surface',
        cards: todoCard('Investigating 500 errors', [
          {
            label: 'Check observability',
            detail: 'Query metrics and logs for 500 errors on flow-test',
            done: true,
          },
          { label: 'Check infra state' },
          { label: 'Identify root cause' },
        ]),
      },
      {
        id: 'cluster',
        title: 'Check cluster state',
        fidelity: 'surface',
        cards: [
          {
            x: 253,
            y: 38,
            width: 378,
            blocks: [
              {
                type: 'areaChart',
                title: 'HTTP Request Rate by Status (5xx vs 2xx) — /ping',
                labels: [
                  '09:30',
                  '10:00',
                  '10:30',
                  '11:00',
                  '11:30',
                  '12:00',
                  '12:30',
                  '01:00',
                ],
              },
              {
                type: 'logs',
                title: 'Error logs',
                subtitle:
                  'Error Logs — stateless container (fault injection evidence)',
                lines: [
                  {
                    text: '2022-11-02T22:40:45 02:40:45.313 raise Exception("unknown internal error")',
                    marker: 'info',
                  },
                  {
                    text: '2022-11-02T22:40:45 02:40:45.313 request_id=FyPyzBADvxn [info] GET /health',
                  },
                  {
                    text: '2022-11-02T22:40:44 02:40:44.217 [info] Application k8s watcher alive',
                  },
                  {
                    text: '2022-11-02T22:40:44 02:40:44.159 [info] received ping for Watchers.Application',
                  },
                  {
                    text: '2022-11-02T22:40:41 02:40:41.738 [info] received ping for Watchers.Upgrade',
                  },
                  {
                    text: '2022-11-02T22:40:40 02:40:40.847 [info] No build found',
                    marker: 'error',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'open-pr',
        title: 'Write fix, open PR',
        fidelity: 'surface',
        cursor: { x: 622, y: 508 },
        cards: [
          {
            x: 235,
            y: 66,
            width: 448,
            blocks: [
              {
                type: 'highlight',
                title: 'Recommended fix',
                parts: [
                  {
                    type: 'text',
                    text: 'Removed the fault injection conditional block from the `/ping` handler so it always returns a successful response.',
                  },
                ],
              },
              {
                type: 'diff',
                file: 'app/main.py',
                summary: '{x} changes made',
                left: [
                  { text: 'from fastapi import FastAPI' },
                  { text: 'import prometheus_client as prom' },
                  { text: '' },
                  { text: '@app.get("/ping")' },
                  { text: 'def ping():' },
                  { text: 'if int(time.time()) % 3 == 0:', removed: true },
                  { text: '  raise Exception("unknown")', removed: true },
                  { text: '  return {"pong": True}' },
                ],
                right: [
                  { text: 'def test_read_root():' },
                  { text: '  response = client.get("/")' },
                  { text: '  assert response.status_code == 200' },
                  { text: '' },
                  { text: 'def test_ping():', added: true },
                  { text: '  response = client.get("/ping")', added: true },
                  { text: '  assert response.status_code == 200', added: true },
                  {
                    text: '  assert response.json() == {"pong": True}',
                    added: true,
                  },
                ],
              },
              {
                type: 'pullRequests',
                title: 'Pull request',
                items: [
                  {
                    path: pullRequestPath,
                    description: 'remove fault injection from /ping handler',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies Record<string, ProductShotScenario>

export type ProductShotScenarioId = keyof typeof productShotScenarios
