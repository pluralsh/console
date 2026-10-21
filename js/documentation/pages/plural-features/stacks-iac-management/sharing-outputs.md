---
title: Sharing Outputs with Continuous Deployment
description: Export Outputs of a Terraform Stack to a Kubernetes CD Service
---

It's frequently necessary to take infrastructure created in a stack and use the data in a Service being deployed to Kubernetes.  A few use cases where this can be important:

* exporting IAM role ARNs for access to various AWS services like S3 or SQS
* exporting DB connection strings to configure as Kubernetes secrets for a webserver
* exporting a dynamically created S3 bucket name to use in your deployed service

This also facilitates end-to-end self-service, as you no longer need a human in the loop to apply that last-mile configuration, plus you get continuous reconciliation in the event a Terraform change implies a recreation of those resources.

## End To End Example

We do this a lot in our service catalog, available here: https://github.com/pluralsh/scaffolds/tree/main/catalogs.  A basic example would be something like our Airbyte setup, where the Terraform stack has an outputs file like so:

```tf
output "access_key_id" {
  value = aws_iam_access_key.airbyte.id
}

output "secret_access_key" {
  value = aws_iam_access_key.airbyte.secret
  sensitive = true
}

output "postgres_host" {
  value = try(module.db.db_instance_address, "")
}

output "postgres_password" {
  value = random_password.password.result
  sensitive = true
}

output "oidc_cookie_secret" {
  value = random_password.oidc_cookie.result
  sensitive = true
}

output "oidc_client_id" {
  value = plural_oidc_provider.airbyte.client_id
  sensitive = true
}

output "oidc_client_secret" {
  value = plural_oidc_provider.airbyte.client_secret
  sensitive = true
}
```

Airbyte needs fixed AWS access keys to communicate with S3, and there's also a dynamically generated OIDC client that's used for auth against its webserver, alongside Postgres credentials.

The InfrastructureStack resource will look like this:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: airbyte-data
  namespace: apps
spec:
  detach: false
  type: TERRAFORM
  approval: true
  manageState: true
  git:
    ref: main
    folder: terraform/apps/airbyte/data
  repositoryRef:
    name: infra
    namespace: infra
  clusterRef:
    name: mgmt
    namespace: infra
```

All of this data needs to be used by the service that is actually deployed to Kubernetes, so it will explicitly "import" that stack with its `imports` declaration, like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: airbyte-data
  namespace: apps
spec:
  namespace: airbyte
  git:
    folder: helm/airbyte/data
    ref: main
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  helm:
    version: "1.x.x"
    chart: airbyte
    release: airbyte
    ignoreHooks: false
    url: https://airbytehq.github.io/helm-charts
    valuesFiles:
    - airbyte.yaml.liquid
  imports:
  - stackRef:
      name: airbyte-data # notice this is the same as the metadata.name and metadata.namespace of the `InfrastructureStack` CRD to resolve the ref
      namespace: apps
  configuration:
    cluster: data
    hostname: airbyte.example.com
    bucket: airbyte-bucket
    region: us-east-2
  clusterRef:
    kind: Cluster
    name: data
    namespace: infra
```

When that is present, it will allow us to template the outputs under the key `imports["airbyte-data"].{output_field_name}` in any .liquid values or YAML file for the service. Here's an example for the Airbyte Helm chart's `airbyte.yaml.liquid` values file:

```yaml
global:
  deploymentMode: oss
  edition: community

  airbyteUrl: {{ configuration.hostname }}

  storage:
    type: S3
    storageSecretName: airbyte-airbyte-secrets
    s3:
      region: {{ configuration.region }}
      authenticationType: credentials
      accessKeyId: {{ imports["airbyte-data"].access_key_id }}
      accessKeyIdSecretKey: AWS_ACCESS_KEY_ID
      secretAccessKey: {{ imports["airbyte-data"].secret_access_key }}
      secretAccessKeySecretKey: AWS_SECRET_ACCESS_KEY
    bucket:
      log: {{ configuration.bucket }}
      state: {{ configuration.bucket }}
      workloadOutput: {{ configuration.bucket }}

  database:
    type: external
    database: airbyte
    host: {{ imports["airbyte-data"].postgres_host }}
    port: "5432"
    secretName: airbyte-airbyte-secrets
    user: airbyte
    userSecretKey: DATABASE_USER
    password: {{ imports["airbyte-data"].postgres_password }}
    passwordSecretKey: DATABASE_PASSWORD

postgresql:
  enabled: false

externalDatabase:
  database: airbyte
  host: {{ imports["airbyte-data"].postgres_host }}
  user: airbyte
  existingSecret: ~
  password: {{ imports["airbyte-data"].postgres_password }}
  port: 5432

webapp:
  ingress:
    enabled: false
  podAnnotations:
    security.plural.sh/oauth-env-secret: airbyte-proxy-config
  podLabels:
    security.plural.sh/inject-oauth-sidecar: "true"
```

You can read more about templating [here](/plural-features/continuous-deployment/service-templating).  In this case, it's going to pass these variables through Helm and configure the necessary secrets and YAML structures with the provided information.

{% callout severity="info" %}
The imports structure is a map from stack name to stack outputs, i.e. a nested map type like { string => { string => any } }
{% /callout %}