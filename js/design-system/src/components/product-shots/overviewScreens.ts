import type { ProductShotLogo } from './scenarios'

export type OverviewNav =
  | 'home'
  | 'cd'
  | 'stacks'
  | 'flows'
  | 'workbenches'
  | 'catalog'
  | 'kubernetes'
  | 'ai'
  | 'security'
  | 'cost'
  | 'settings'

export type OverviewStatus = 'healthy' | 'progressing' | 'failed'
export type OverviewJobStatus = 'running' | 'success' | 'failed'

export type OverviewService = {
  name: string
  cluster: string
  repository: string
  activity: string
  status: OverviewStatus
  errors?: number
}

export type OverviewWorkbench = {
  name: string
  description: string
  tools: ProductShotLogo[]
}

export type OverviewSideItem = { name: string; logo?: ProductShotLogo }

export type OverviewJob = {
  prompt: string
  skill?: string
  pr?: string
  cost: string
  tokens: string
  user: string
  time: string
}

export type OverviewFlowContent = {
  type: 'flow'
  name: string
  tabs: string[]
  workbenches: OverviewWorkbench[]
  summary: { label: string; value: string; status?: OverviewStatus }[]
  services: OverviewService[]
}

export type OverviewWorkbenchContent = {
  type: 'workbench'
  name: string
  tabs: string[]
  tools: OverviewSideItem[]
  webhooks: OverviewSideItem[]
  cron: { schedule: string; prompt: string }
  prompt: string
  promptChips: string[]
  jobGroups: {
    label: string
    status: OverviewJobStatus
    count: number
    jobs: OverviewJob[]
  }[]
}

export type OverviewScreen = {
  id: string
  title: string
  nav: OverviewNav
  breadcrumbs: string[]
  content: OverviewFlowContent | OverviewWorkbenchContent
}

export const overviewScreens = {
  flow: {
    id: 'flow',
    title: 'Flow',
    nav: 'flows',
    breadcrumbs: ['flows', 'payments-platform', 'services'],
    content: {
      type: 'flow',
      name: 'payments-platform',
      tabs: [
        'Services',
        'Workbenches',
        'Pipelines',
        'Previews',
        'Alerts',
        'Vulnerabilities',
      ],
      workbenches: [
        {
          name: 'payments-oncall',
          description:
            'Triages Grafana alerts for checkout and payments, finds the root cause, and opens a fix PR.',
          tools: ['grafana', 'prometheus', 'github'],
        },
        {
          name: 'backlog-runner',
          description:
            'Picks up Jira tickets labeled agent-ready and drafts GitOps changes for review.',
          tools: ['jira', 'github'],
        },
        {
          name: 'cost-watch',
          description:
            'Weekly right-sizing report for the payments clusters with PRs for idle capacity.',
          tools: ['datadog', 'gitlab'],
        },
      ],
      summary: [
        { label: 'Services', value: '24' },
        { label: 'Healthy', value: '21', status: 'healthy' },
        { label: 'Progressing', value: '2', status: 'progressing' },
        { label: 'Failed', value: '1', status: 'failed' },
      ],
      services: [
        {
          name: 'checkout-api',
          cluster: 'prod-us-east',
          repository: 'pluralsh/payments',
          activity: '2m ago',
          status: 'progressing',
        },
        {
          name: 'payments-svc',
          cluster: 'prod-us-east',
          repository: 'pluralsh/payments',
          activity: '14m ago',
          status: 'failed',
          errors: 3,
        },
        {
          name: 'ledger-worker',
          cluster: 'prod-us-east',
          repository: 'pluralsh/ledger',
          activity: '1h ago',
          status: 'healthy',
        },
        {
          name: 'fraud-scoring',
          cluster: 'prod-eu-west',
          repository: 'pluralsh/risk',
          activity: '3h ago',
          status: 'healthy',
        },
        {
          name: 'invoice-renderer',
          cluster: 'prod-eu-west',
          repository: 'pluralsh/billing',
          activity: '5h ago',
          status: 'progressing',
        },
        {
          name: 'webhook-relay',
          cluster: 'prod-us-east',
          repository: 'pluralsh/payments',
          activity: '1d ago',
          status: 'healthy',
        },
        {
          name: 'grafana',
          cluster: 'mgmt',
          repository: 'pluralsh/observability',
          activity: '1d ago',
          status: 'healthy',
        },
        {
          name: 'redis-cache',
          cluster: 'prod-us-east',
          repository: 'pluralsh/platform',
          activity: '2d ago',
          status: 'healthy',
        },
        {
          name: 'stripe-sync',
          cluster: 'prod-eu-west',
          repository: 'pluralsh/billing',
          activity: '3d ago',
          status: 'healthy',
        },
      ],
    },
  },
  workbench: {
    id: 'workbench',
    title: 'Workbench',
    nav: 'workbenches',
    breadcrumbs: ['workbenches', 'platform-agent', 'launch'],
    content: {
      type: 'workbench',
      name: 'platform-agent',
      tabs: ['Launch', 'Jobs', 'Monitoring', 'Issues', 'Alerts'],
      tools: [
        { name: 'Prometheus', logo: 'prometheus' },
        { name: 'GitHub', logo: 'github' },
        { name: 'Linear', logo: 'linear' },
        { name: 'Elastic', logo: 'elastic' },
      ],
      webhooks: [
        { name: 'Grafana alerts', logo: 'grafana' },
        { name: 'Failed build', logo: 'github' },
        { name: 'Deploy notifications' },
      ],
      cron: {
        schedule: '*/5 * * * *',
        prompt:
          'Check cluster health and open a PR for any services that drifted.',
      },
      prompt:
        'Send a job to your workbench. Use / for skills and @ to mention clusters, services, stacks or repositories.',
      promptChips: ['claude-opus', 'Coding', 'Kubernetes'],
      jobGroups: [
        {
          label: 'Running',
          status: 'running',
          count: 2,
          jobs: [
            {
              prompt:
                'Investigate the spike in 500s on checkout-api after the latest deploy',
              cost: '$0.42',
              tokens: '512K',
              user: 'AN',
              time: 'now',
            },
            {
              skill: 'Upgrade',
              prompt: 'Bump ingress-nginx to 1.12 across all dev clusters',
              cost: '$0.27',
              tokens: '301K',
              user: 'MM',
              time: '2m',
            },
          ],
        },
        {
          label: 'Successful',
          status: 'success',
          count: 128,
          jobs: [
            {
              prompt:
                'Grafana alert: p95 latency over 2s on payments-svc. Find the root cause and fix it',
              pr: '#4821',
              cost: '$1.18',
              tokens: '1.4M',
              user: 'JL',
              time: '1h',
            },
            {
              skill: 'Cost report',
              prompt:
                'Weekly EKS spend by cluster, flag anything idle for 7+ days',
              cost: '$2.31',
              tokens: '2.8M',
              user: 'PC',
              time: '3h',
            },
            {
              prompt:
                'Rotate the TLS certificates expiring this month in prod-us-east',
              pr: '3 PRs',
              cost: '$0.87',
              tokens: '960K',
              user: 'AN',
              time: '5h',
            },
          ],
        },
        {
          label: 'Failed',
          status: 'failed',
          count: 1,
          jobs: [
            {
              prompt: 'Roll back the cache config change on staging-eu',
              cost: '$0.19',
              tokens: '140K',
              user: 'MM',
              time: '1d',
            },
          ],
        },
      ],
    },
  },
} as const satisfies Record<string, OverviewScreen>

export type OverviewScreenId = keyof typeof overviewScreens
