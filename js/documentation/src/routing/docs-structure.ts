export type DocSection = {
  path: string
  title: string
  sections?: DocSection[]
}

/**
 * docs structure single source of truth
 * will search for md files with the paths described below, first for an index.md file at the root of each section, then for a PATH_NAME.md file if index isn't found
 * unspecified routes, or specified routes without a corresponding md file, will 404 unless referenced in the redirects object
 * UI sidebar order will match array order, using titles below
 *
 * */
export const docsStructure: DocSection[] = [
  {
    path: 'overview',
    title: 'Overview',
    sections: [
      { path: 'introduction', title: 'Introduction' },
      { path: 'architecture', title: 'Architecture' },
    ],
  },
  {
    path: 'getting-started',
    title: 'Getting Started',
    sections: [
      {
        path: 'first-steps',
        title: 'First steps',
        sections: [
          { path: 'cli-quickstart', title: 'Quickstart with the Plural CLI' },
          { path: 'existing-cluster', title: 'Bring your own K8s cluster' },
          {
            path: 'plural-cloud',
            title: 'Host Your Plural Console with Plural Cloud',
          },
          {
            path: 'add-a-cluster',
            title: 'Add A Cluster To Plural',
          },
        ],
      },
      {
        path: 'how-to-use',
        title: 'How to use Plural',
        sections: [
          { path: 'mgmt-cluster', title: 'Provision a management cluster' },
          { path: 'rbac', title: 'Add RBAC to the K8s dashboard' },
          {
            path: 'scm-connection',
            title: 'Connect a source control provider',
          },
          { path: 'workload-cluster', title: 'Provision a workload cluster' },
          { path: 'controllers', title: 'Set up ingress on a cluster' },
          { path: 'observability', title: 'Set up full stack observability' },
          { path: 'microservice', title: 'Deploy your first microservice' },
          {
            path: 'pr-automation',
            title: 'Use PR automations for self-service',
          },
          { path: 'pipelines', title: 'Setup a dev -> prod pipeline' },
          { path: 'cleaning-up', title: 'Cleaning Up' },
        ],
      },
      {
        path: 'advanced-config',
        title: 'Advanced configuration',
        sections: [
          { path: 'sandboxing', title: 'Sandboxing your cluster' },
          { path: 'edge-configuration', title: 'Edge configuration' },
          { path: 'network-configuration', title: 'Network configuration' },
          { path: 'private-ca', title: 'Handling private CAs' },
        ],
      },
    ],
  },

  {
    path: 'api-reference',
    title: 'API Reference',
    sections: [
      {
        path: 'kubernetes',
        title: 'Kubernetes API Reference',
        sections: [
          {
            path: 'management-api-reference',
            title: 'Management API Reference',
          },
          { path: 'agent-api-reference', title: 'Agent API Reference' },
        ],
      },
      {
        path: 'graphql',
        title: 'GraphQL API Reference',
      },
      {
        path: 'rest',
        title: 'REST API Reference',
      },
      {
        path: 'terraform',
        title: 'Terraform Provider reference',
        sections: [{ path: 'pulumi', title: 'Using from Pulumi' }],
      },
    ],
  },
  {
    path: 'plural-features',
    title: 'Plural Features',
    sections: [
      {
        path: 'continuous-deployment',
        title: 'Continuous deployment',
        sections: [
          {
            path: 'management-controller',
            title: 'Management controller',
            sections: [
              {
                path: 'deployment-settings',
                title: 'DeploymentSettings',
              },
            ],
          },
          {
            path: 'deployment-operator',
            title: 'The deployment operator',
            sections: [
              {
                path: 'agent-configuration',
                title: 'AgentConfiguration',
              },
              {
                path: 'custom-health',
                title: 'CustomHealth Lua authoring',
              },
            ],
          },
          { path: 'git-service', title: 'Git-sourced services' },
          { path: 'helm-service', title: 'Helm-sourced services' },
          {
            path: 'multi-source-services',
            title: 'Multi-source services',
          },
          {
            path: 'resource-application-logic',
            title: 'Resource Application Logic',
          },
          {
            path: 'service-templating',
            title: 'Service templating',
            sections: [
              {
                path: 'supporting-liquid-filters',
                title: 'Supporting Liquid Filters',
              },
            ],
          },
          { path: 'lua', title: 'Dynamic Helm Configuration with Lua Scripts' },
          { path: 'global-service', title: 'Global services' },
          {
            path: 'observer',
            title: 'Plural Observers in Continuous Deployment',
          },
          { path: 'pipelines', title: 'Pipelines' },
          {
            path: 'github-actions-ci',
            title: 'Integration with Github Actions/CI',
          },
          {
            path: 'management-controllers-reconciliation-logic',
            title: 'Management Controllers Reconciliation Logic',
          },
        ],
      },
      {
        path: 'k8s-upgrade-assistant',
        title: 'Plural upgrade assistant',
        sections: [
          { path: 'upgrade-insights', title: 'Upgrade insights' },
          { path: 'addon-compatibilities', title: 'Add-on compatibilities' },
          { path: 'cluster-drain', title: 'Cluster Drain Management' },
        ],
      },
      {
        path: 'stacks-iac-management',
        title: 'Stacks — IaC management',
        sections: [
          { path: 'customize-runners', title: 'Customize stack runners' },
          { path: 'pulumi', title: 'Pulumi stacks' },
          { path: 'pr-workflow', title: 'Stack PR workflow' },
          { path: 'manual-runs', title: 'Manual runs' },
          {
            path: 'sharing-outputs',
            title: 'Sharing Outputs with Continuous Deployment',
          },
          { path: 'custom-stacks', title: 'Custom stacks' },
          { path: 'auto-cancellation', title: 'Auto cancellation' },
          { path: 'local-execution', title: 'Local execution' },
          {
            path: 'service-contexts',
            title: 'Terraform interop with service contexts',
          },
        ],
      },
      {
        path: 'service-catalog',
        title: 'Service catalog',
        sections: [
          { path: 'creation', title: 'Creating your own catalog' },
          { path: 'contribution-program', title: 'Contribution program' },
        ],
      },
      {
        path: 'workbenches',
        title: 'Workbenches',
        sections: [
          { path: 'configuration', title: 'Setting up a workbench' },
          { path: 'coding-agent', title: 'Coding agent' },
          {
            path: 'tools',
            title: 'Workbench tools',
            sections: [{ path: 'datadog', title: 'Datadog integration' }],
          },
          { path: 'running-jobs', title: 'Running workbench jobs' },
          { path: 'automation', title: 'Automating workbench jobs' },
          {
            path: 'follow-up-automation',
            title: 'Automating workbench follow-up',
          },
          { path: 'use-cases', title: 'Common use cases' },
        ],
      },
      {
        path: 'policy-management',
        title: 'Policy management',
        sections: [
          { path: 'stack-policies', title: 'Stack policies' },
          { path: 'workbench-policies', title: 'Workbench policies' },
          {
            path: 'simulating-policies',
            title: 'Simulating and testing policies',
          },
          { path: 'common-use-cases', title: 'Common use cases' },
        ],
      },
      { path: 'kubernetes-dashboard', title: 'Kubernetes dashboard' },
      {
        path: 'plural-ai',
        title: 'Plural AI',
        sections: [
          {
            path: 'ai-agent',
            title: 'AI Background Agent',
            sections: [
              {
                path: 'configure-agent',
                title: 'Agent configuration and usage',
              },
              {
                path: 'remote-browser',
                title: 'Remote browser setup',
              },
            ],
          },
          {
            path: 'sentinels',
            title: 'At-Scale Infrastructure Testing with Sentinels',
          },
          {
            path: 'multi-model-configuration',
            title: 'Set Up and Configure Plural AI',
          },
        ],
      },
      {
        path: 'flows',
        title: 'Plural Flows',
        sections: [
          { path: 'create-a-flow', title: 'Create a flow' },
          { path: 'flow-ai', title: 'Plural AI and Flows' },
          { path: 'preview-environments', title: 'Preview Environments' },
          { path: 'mcp', title: 'Flow MCP Server Integration' },
          { path: 'mcp-auth', title: 'Flow MCP Server Authentication' },
          {
            path: 'scm-webhooks-and-pr-linking',
            title: 'SCM webhooks and PR linking',
          },
        ],
      },
      {
        path: 'observability',
        title: 'Observability Integration',
        sections: [
          { path: 'prometheus', title: 'Prometheus' },
          { path: 'logging', title: 'Log Aggregation' },
          { path: 'cost', title: 'Cost Management' },
          {
            path: 'observability-webhooks',
            title: 'Observability Webhooks',
            sections: [
              { path: 'datadog', title: 'Datadog' },
              { path: 'grafana', title: 'Grafana' },
            ],
          },
        ],
      },
      {
        path: 'pr-automation',
        title: 'Pull request automation',
        sections: [
          { path: 'crds', title: 'PR automation custom resources' },
          {
            path: 'governance',
            title: 'PR Governance Controller',
            sections: [
              { path: 'servicenow', title: 'ServiceNow Governance' },
              { path: 'webhook', title: 'Custom Webhook Governance' },
            ],
          },
          {
            path: 'ai-based-pr-automations',
            title: 'Prompt-to-PR Automations',
          },
          { path: 'description-patterns', title: 'PR Description Patterns' },
          { path: 'testing', title: 'PR automation testing' },
          { path: 'lua', title: 'Lua-based Pre-Processing' },
          { path: 'pipelines', title: 'PR automation pipelines' },
          { path: 'filters', title: 'Liquid Filters in PR Automation' },
        ],
      },
      {
        path: 'projects-and-multi-tenancy',
        title: 'Projects and multi-tenancy',
      },
      { path: 'notifications', title: 'Notification configuration' },
    ],
  },
  {
    path: 'resources',
    title: 'Resources',
    sections: [
      { path: 'release-notes', title: 'Release Notes' },
      { path: 'product-updates', title: 'Product Updates' },
      { path: 'security', title: 'Plural Security Certifications' },
      // { path: 'paid-tiers', title: 'Plural Pricing Model' },
      {
        path: 'architecture',
        title: 'Advanced Architecture',
        sections: [
          { path: 'gitops-architecture', title: 'GitOps Architecture' },
        ],
      },
    ],
  },
]

/**
 * redirects
 *
 * */
export const redirects = [
  {
    source: '/getting-started/agent-api-reference',
    destination: '/overview/agent-api-reference',
    permanent: true,
  },
  {
    source: '/getting-started/readme',
    destination: '/getting-started',
    permanent: true,
  },
  {
    source: '/getting-started/quickstart',
    destination: '/getting-started/first-steps',
    permanent: true,
  },
  {
    source: '/deployments/architecture',
    destination: '/overview/architecture',
    permanent: true,
  },
  {
    source: '/reference/architecture',
    destination: '/',
    permanent: true,
  },
  {
    source: '/deployments/operator/api',
    destination: '/overview/api-reference',
    permanent: true,
  },
  {
    source: '/deployments/cli-quickstart',
    destination: '/getting-started/first-steps/cli-quickstart',
    permanent: true,
  },
  {
    source: '/deployments/existing-cluster',
    destination: '/getting-started/first-steps/existing-cluster',
    permanent: true,
  },
  {
    source: '/getting-started/deployments',
    destination: '/getting-started/first-steps/index',
    permanent: true,
  },
  {
    source: '/how-to/set-up/mgmt-cluster',
    destination: '/getting-started/how-to-use/mgmt-cluster',
    permanent: true,
  },
  {
    source: '/how-to/set-up/rbac',
    destination: '/getting-started/how-to-use/rbac',
    permanent: true,
  },
  {
    source: '/how-to/set-up/scm-connection',
    destination: '/getting-started/how-to-use/scm-connection',
    permanent: true,
  },
  {
    source: '/how-to/set-up/workload-cluster',
    destination: '/getting-started/how-to-use/workload-cluster',
    permanent: true,
  },
  {
    source: '/how-to/set-up/controllers',
    destination: '/getting-started/how-to-use/controllers',
    permanent: true,
  },
  {
    source: '/how-to/deploy/pr-automation',
    destination: '/getting-started/how-to-use/pr-automation',
    permanent: true,
  },
  {
    source: '/how-to/deploy/microservice',
    destination: '/getting-started/how-to-use/microservice',
    permanent: true,
  },
  {
    source: '/how-to/deploy/pipelines',
    destination: '/getting-started/how-to-use/pipelines',
    permanent: true,
  },
  {
    source: '/how-to/index',
    destination: '/getting-started/how-to-use/index',
    permanent: true,
  },
  {
    source: '/deployments/sandboxing',
    destination: '/getting-started/advanced-config/sandboxing',
    permanent: true,
  },
  {
    source: '/deployments/network-configuration',
    destination: '/getting-started/advanced-config/network-configuration',
    permanent: true,
  },
  {
    source: '/deployments/private-ca',
    destination: '/getting-started/advanced-config/private-ca',
    permanent: true,
  },
  {
    source: '/deployments/operator/architecture',
    destination: '/plural-features/continuous-deployment/deployment-operator',
    permanent: true,
  },
  {
    source:
      '/plural-features/continuous-deployment/deployment-operator/deployment-settings',
    destination:
      '/plural-features/continuous-deployment/management-controller/deployment-settings',
    permanent: true,
  },
  {
    source: '/deployments/operator/git-service',
    destination: '/plural-features/continuous-deployment/git-service',
    permanent: true,
  },
  {
    source: '/deployments/operator/helm-service',
    destination: '/plural-features/continuous-deployment/helm-service',
    permanent: true,
  },
  {
    source: '/deployments/operator/global-service',
    destination: '/plural-features/continuous-deployment/global-service',
    permanent: true,
  },
  {
    source: '/deployments/using-operator',
    destination: '/plural-features/continuous-deployment/index',
    permanent: true,
  },
  {
    source: '/deployments/deprecations',
    destination: '/plural-features/k8s-upgrade-assistant/index',
    permanent: true,
  },
  {
    source: '/stacks/customize-runners',
    destination: '/plural-features/stacks-iac-management/customize-runners',
    permanent: true,
  },
  {
    source: '/stacks/pr-workflow',
    destination: '/plural-features/stacks-iac-management/pr-workflow',
    permanent: true,
  },
  {
    source: '/stacks/manual-runs',
    destination: '/plural-features/stacks-iac-management/manual-runs',
    permanent: true,
  },
  {
    source: '/stacks/local-execution',
    destination: '/plural-features/stacks-iac-management/local-execution',
    permanent: true,
  },
  {
    source: '/stacks/custom-stacks',
    destination: '/plural-features/stacks-iac-management/custom-stacks',
    permanent: true,
  },
  {
    source: '/stacks/auto-cancellation',
    destination: '/plural-features/stacks-iac-management/auto-cancellation',
    permanent: true,
  },
  {
    source: '/deployments/terraform-interop',
    destination: '/plural-features/stacks-iac-management/service-contexts',
    permanent: true,
  },
  {
    source: '/deployments/stacks',
    destination: '/plural-features/stacks-iac-management/index',
    permanent: true,
  },
  {
    source: '/service-catalog/creation',
    destination: '/plural-features/service-catalog/creation',
    permanent: true,
  },
  {
    source: '/service-catalog/contributing',
    destination: '/plural-features/service-catalog/contribution-program',
    permanent: true,
  },
  {
    source: '/service-catalog/overview',
    destination: '/plural-features/service-catalog/index',
    permanent: true,
  },
  {
    source: '/deployments/dashboard',
    destination: '/plural-features/kubernetes-dashboard/index',
    permanent: true,
  },
  {
    source: '/ai/setup',
    destination: '/plural-features/plural-ai/multi-model-configuration',
    permanent: true,
  },
  {
    source: '/plural-features/plural-ai/setup',
    destination: '/plural-features/plural-ai/multi-model-configuration',
    permanent: true,
  },
  {
    source: '/ai/architecture',
    destination: '/plural-features/plural-ai',
    permanent: true,
  },
  {
    source: '/ai/cost',
    destination: '/plural-features/plural-ai',
    permanent: true,
  },
  {
    source: '/plural-features/plural-ai/architecture',
    destination: '/plural-features/plural-ai',
    permanent: true,
  },
  {
    source: '/plural-features/plural-ai/arch-diagram',
    destination: '/plural-features/plural-ai',
    permanent: true,
  },
  {
    source: '/plural-features/plural-ai/cost',
    destination: '/plural-features/plural-ai',
    permanent: true,
  },
  {
    source: '/ai/overview',
    destination: '/plural-features/plural-ai/index',
    permanent: true,
  },
  {
    source: '/deployments/pr/crds',
    destination: '/plural-features/pr-automation/crds',
    permanent: true,
  },
  {
    source: '/deployments/pr/testing',
    destination: '/plural-features/pr-automation/testing',
    permanent: true,
  },
  {
    source: '/deployments/pr/pipelines',
    destination: '/plural-features/pr-automation/pipelines',
    permanent: true,
  },
  {
    source: '/deployments/pr-automation',
    destination: '/plural-features/pr-automation/index',
    permanent: true,
  },
  {
    source: '/deployments/templating',
    destination: '/plural-features/service-templating/index',
    permanent: true,
  },
  {
    source: '/deployments/multi-tenancy',
    destination: '/plural-features/projects-and-multi-tenancy/index',
    permanent: true,
  },
  {
    source: '/deployments/notifications',
    destination: '/plural-features/notifications/index',
    permanent: true,
  },
  {
    source: '/faq/plural-paid-tiers',
    destination: '/faq/paid-tiers',
    permanent: true,
  },
  {
    source: '/reference/release-notes',
    destination: '/resources/release-notes',
    permanent: true,
  },
  {
    source: '/management-api-reference',
    destination: '/api-reference/kubernetes/management-api-reference',
    permanent: true,
  },
  {
    source: '/agent-api-reference',
    destination: '/api-reference/kubernetes/agent-api-reference',
    permanent: true,
  },
]
