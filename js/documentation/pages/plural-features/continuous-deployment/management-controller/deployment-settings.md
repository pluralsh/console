---
title: DeploymentSettings
description: Configure global Plural CD settings via the DeploymentSettings CRD
---

`DeploymentSettings` is the global configuration resource for Plural Continuous Deployment. It lives on your **management cluster** and drives Console-wide settings that are not tied to a single service or cluster: agent helm defaults, repository references, RBAC bindings, observability integrations, AI configuration, stack runner defaults, and more.

If you bootstrapped with `plural up`, you likely already have this resource defined at `bootstrap/settings.yaml` in your management repo.

## Singleton resource

Only one `DeploymentSettings` resource is ever reconciled. The management controller watches for a resource with an exact identity:

| Field | Required value |
| --- | --- |
| `metadata.name` | `global` |
| `metadata.namespace` | `plrl-deploy-operator` |

Any other name or namespace is **ignored**. The controller will not apply your spec to the Console API. Instead, check `status.conditions` on the resource — you should see a `Synchronized` condition set to `False` with a message similar to:

```text
ignoring because of invalid name/namespace, only the global/plrl-deploy-operator DeploymentSettings will be reconciled
```

When the name and namespace are correct and the spec reconciles successfully, expect `Synchronized=True` and `Ready=True` on `status.conditions`.

{% callout severity="warn" %}
Do not create multiple `DeploymentSettings` resources expecting them all to apply. Only `global` in `plrl-deploy-operator` is processed. Use a single manifest and merge all desired configuration into one `spec`.
{% /callout %}

## Minimal example

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global
  namespace: plrl-deploy-operator
spec:
  managementRepo: pluralsh/plrl-boot-aws
```

## Spec reference

All fields below are optional unless noted. The full schema with validation rules is in the {% doclink to="overview_api_reference" %}Management API Reference{% /doclink %} under `DeploymentSettings`.

### `managementRepo`

The root Git repository for your Plural infrastructure — typically the repo created by `plural up`. This is used to anchor management-cluster configuration and related automation.

```yaml
spec:
  managementRepo: pluralsh/plrl-boot-aws
```

### `deploymentRepositoryRef` and `scaffoldsRepositoryRef`

Pointers to `GitRepository` CRDs that define where deployment manifests and scaffolds are sourced from.

```yaml
spec:
  deploymentRepositoryRef:
    name: main-deployment-repo
    namespace: plrl-deploy-operator
  scaffoldsRepositoryRef:
    name: scaffolds-repo
    namespace: plrl-deploy-operator
```

### `agentHelmValues`

Custom Helm values applied to **all** deployment agents in your fleet. Use this for fleet-wide image registry overrides, annotations, resource limits, or other chart-level defaults.

```yaml
spec:
  agentHelmValues:
    image:
      repository: your.enterprise.registry/pluralsh/deployment-operator
    agentk:
      image:
        repository: your.enterprise.registry/pluralsh/agentk
```

See the [sandboxing guide](/getting-started/advanced-config/sandboxing) for a full enterprise registry walkthrough.

### `bindings`

Global RBAC bindings for Console CD resources. Each binding list accepts the standard Plural `Binding` shape (users, groups, service accounts).

```yaml
spec:
  bindings:
    read:
      - user:
          email: dev-team@company.com
    write:
      - group:
          name: platform-engineers
    create:
      - group:
          name: developers
    git:
      - group:
          name: git-admins
```

### `stacks`

Global defaults for Plural Stack execution, including the job template used for stack runs and an optional SCM connection for PR workflows.

```yaml
spec:
  stacks:
    connectionRef:
      name: github
      namespace: plrl-deploy-operator
    jobSpec:
      serviceAccount: stacks
      namespace: plrl-deploy-operator
```

### `prometheusConnection` and `lokiConnection`

HTTP connection details for metrics and log backends integrated into the Plural Console UI.

```yaml
spec:
  prometheusConnection:
    host: https://prometheus.company.com
    user: monitoring
    passwordSecretRef:
      name: prometheus-creds
      key: password
  lokiConnection:
    host: https://loki.company.com
    user: monitoring
    passwordSecretRef:
      name: loki-creds
      key: password
```

### `logging`

Configures log aggregation integrations (Victoria, Elasticsearch, or OpenSearch) for Plural AI log analysis and the observability UI.

```yaml
spec:
  logging:
    enabled: true
    driver: ELASTIC
    elastic:
      host: https://elastic.company.com
      index: plrl-logs-*
      user: plrl
      passwordSecretRef:
        name: plrl-elastic-user
        key: password
```

### `cost`

Tuning knobs for Kubecost-based rightsizing recommendations surfaced in the Console.

```yaml
spec:
  cost:
    recommendationCushion: 20      # percentage headroom over average utilization
    recommendationThreshold: 100   # minimum monthly cost (USD) to surface a recommendation
```

### `metrics`

OpenTelemetry metrics export from the Console.

```yaml
spec:
  metrics:
    enabled: true
    endpoint: https://otel-collector.company.com:4318
    crontab: "*/5 * * * *"
```

### `ai`

LLM provider configuration for Plural AI. Supports OpenAI, Anthropic, Azure, Bedrock, Vertex, Ollama, and compatible providers. API keys and service account JSON should be stored in Kubernetes secrets in `plrl-deploy-operator` and referenced via `*SecretRef` fields.

```yaml
spec:
  ai:
    enabled: true
    provider: OPENAI
    openAI:
      model: gpt-4
      tokenSecretRef:
        name: ai-config
        key: openai
```

For a complete AI configuration guide, see [Set Up and Configure Plural AI](/plural-features/plural-ai/multi-model-configuration). For observability + AI together, see [Observability Configuration](/plural-features/observability).

### `reconciliation`

Controls drift detection and reconciliation intervals for this resource. See [Management Controllers Reconciliation Logic](/plural-features/continuous-deployment/management-controllers-reconciliation-logic) for how the controller synchronizes CRD state with the Console API.

```yaml
spec:
  reconciliation:
    interval: 5m
    driftDetection:
      enabled: true
```

## Kitchen-sink example

A single manifest combining several common configuration areas:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global
  namespace: plrl-deploy-operator
spec:
  managementRepo: pluralsh/plrl-boot-aws

  agentHelmValues:
    image:
      repository: your.enterprise.registry/pluralsh/deployment-operator

  bindings:
    write:
      - group:
          name: platform-engineers

  prometheusConnection:
    host: https://prometheus.company.com
    passwordSecretRef:
      name: prom-creds
      key: password

  logging:
    enabled: true
    driver: ELASTIC
    elastic:
      host: https://elastic.company.com
      index: plrl-logs-*
      passwordSecretRef:
        name: elastic-creds
        key: password

  cost:
    recommendationCushion: 15
    recommendationThreshold: 1

  ai:
    enabled: true
    provider: OPENAI
    openAI:
      tokenSecretRef:
        name: ai-config
        key: openai
```

## Verifying configuration

After applying your manifest, confirm the controller picked it up:

```bash
kubectl get deploymentsettings global -n plrl-deploy-operator -o yaml
```

Check `status.conditions` for `Ready` and `Synchronized`. If either is `False`, the `message` field on the condition explains what went wrong — common causes include an incorrect resource name/namespace, missing referenced secrets, or invalid AI provider configuration.

You can also edit many of these settings in the Console UI under **Settings**, but GitOps via `DeploymentSettings` is the recommended approach for reproducible, auditable platform configuration.
