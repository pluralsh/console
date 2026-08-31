import { type ComponentProps } from 'react'

import { Link as DSLink } from '@pluralsh/design-system/dist/markdoc/components'

/**
 * @deprecated don't use in new docs, prefer regular markdown links to routes directly
 */
export const doclink = {
  render: DocLink,
  attributes: {
    to: { type: String, required: true },
  },
  description: 'Link to another documentation page using its route ID',
  example: '{% doclink to="api-ref" %}API Reference{% /doclink %}',
}

function DocLink({
  to,
  children,
  ...props
}: { to: string } & Omit<ComponentProps<typeof DSLink>, 'href'>) {
  const href = oldDocIDtoRouteMap[to]

  return href ? (
    <DSLink
      href={href}
      {...props}
    >
      {children}
    </DSLink>
  ) : (
    children
  )
}

/**
 * @deprecated maps old doc IDs to their original routes.
 */
const oldDocIDtoRouteMap: Record<string, string> = {
  overview_introduction: '/overview/introduction',
  overview_architecture: '/overview/architecture',
  overview_management_api_reference: '/overview/management-api-reference',
  overview_agent_api_reference: '/overview/agent-api-reference',
  getting_started_first_steps: '/getting-started/first-steps',
  getting_started_first_steps_cli_quickstart:
    '/getting-started/first-steps/cli-quickstart',
  getting_started_first_steps_existing_cluster:
    '/getting-started/first-steps/existing-cluster',
  getting_started_first_steps_plural_cloud:
    '/getting-started/first-steps/plural-cloud',
  getting_started_how_to_use: '/getting-started/how-to-use',
  getting_started_how_to_use_mgmt_cluster:
    '/getting-started/how-to-use/mgmt-cluster',
  getting_started_how_to_use_rbac: '/getting-started/how-to-use/rbac',
  getting_started_how_to_use_scm_connection:
    '/getting-started/how-to-use/scm-connection',
  getting_started_how_to_use_workload_cluster:
    '/getting-started/how-to-use/workload-cluster',
  getting_started_how_to_use_controllers:
    '/getting-started/how-to-use/controllers',
  getting_started_how_to_use_observability:
    '/getting-started/how-to-use/observability',
  getting_started_how_to_use_microservice:
    '/getting-started/how-to-use/microservice',
  getting_started_how_to_use_pr_automation:
    '/getting-started/how-to-use/pr-automation',
  getting_started_how_to_use_pipelines: '/getting-started/how-to-use/pipelines',
  getting_started_advanced_config: '/getting-started/advanced-config',
  getting_started_advanced_config_sandboxing:
    '/getting-started/advanced-config/sandboxing',
  getting_started_advanced_config_network_configuration:
    '/getting-started/advanced-config/network-configuration',
  getting_started_advanced_config_private_ca:
    '/getting-started/advanced-config/private-ca',
  plural_features_continuous_deployment:
    '/plural-features/continuous-deployment',
  plural_features_continuous_deployment_deployment_operator:
    '/plural-features/continuous-deployment/deployment-operator',
  plural_features_continuous_deployment_git_service:
    '/plural-features/continuous-deployment/git-service',
  plural_features_continuous_deployment_helm_service:
    '/plural-features/continuous-deployment/helm-service',
  plural_features_continuous_deployment_global_service:
    '/plural-features/continuous-deployment/global-service',
  plural_features_k8s_upgrade_assistant:
    '/plural-features/k8s-upgrade-assistant',
  plural_features_k8s_upgrade_assistant_upgrade_insights:
    '/plural-features/k8s-upgrade-assistant/upgrade-insights',
  plural_features_stacks_iac_management:
    '/plural-features/stacks-iac-management',
  plural_features_stacks_iac_management_pulumi:
    '/plural-features/stacks-iac-management/pulumi',
  plural_features_stacks_iac_management_customize_runners:
    '/plural-features/stacks-iac-management/customize-runners',
  plural_features_stacks_iac_management_pr_workflow:
    '/plural-features/stacks-iac-management/pr-workflow',
  plural_features_stacks_iac_management_manual_runs:
    '/plural-features/stacks-iac-management/manual-runs',
  plural_features_stacks_iac_management_sharing_outputs:
    '/plural-features/stacks-iac-management/sharing-outputs',
  plural_features_stacks_iac_management_custom_stacks:
    '/plural-features/stacks-iac-management/custom-stacks',
  plural_features_stacks_iac_management_auto_cancellation:
    '/plural-features/stacks-iac-management/auto-cancellation',
  plural_features_stacks_iac_management_local_execution:
    '/plural-features/stacks-iac-management/local-execution',
  plural_features_stacks_iac_management_service_contexts:
    '/plural-features/stacks-iac-management/service-contexts',
  plural_features_service_catalog: '/plural-features/service-catalog',
  plural_features_service_catalog_creation:
    '/plural-features/service-catalog/creation',
  plural_features_service_catalog_contribution_program:
    '/plural-features/service-catalog/contribution-program',
  plural_features_kubernetes_dashboard: '/plural-features/kubernetes-dashboard',
  plural_features_plural_ai: '/plural-features/plural-ai',
  plural_features_plural_ai_setup:
    '/plural-features/plural-ai/multi-model-configuration',
  plural_features_plural_ai_architecture: '/plural-features/plural-ai',
  plural_features_plural_ai_cost: '/plural-features/plural-ai',
  plural_features_pr_automation: '/plural-features/pr-automation',
  plural_features_pr_automation_crds: '/plural-features/pr-automation/crds',
  plural_features_pr_automation_testing:
    '/plural-features/pr-automation/testing',
  plural_features_pr_automation_pipelines:
    '/plural-features/pr-automation/pipelines',
  plural_features_service_templating: '/plural-features/service-templating',
  plural_features_service_templating_templating_filters:
    '/plural-features/service-templating/supporting-liquid-filters',
  plural_features_projects_and_multi_tenancy:
    '/plural-features/projects-and-multi-tenancy',
  plural_features_notifications: '/plural-features/10-notifications',
  faq_security: '/faq/security',
  faq_plural_oidc: '/faq/plural-oidc',
  faq_certifications: '/faq/certifications',
  faq_paid_tiers: '/faq/paid-tiers',
  resources_release_notes: '/resources/release-notes',
}
