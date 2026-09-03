---
title: Pulumi stacks
description: Configure Pulumi stacks and authenticate to Pulumi Cloud or self-managed state backends
---

Plural runs Pulumi programs through an `InfrastructureStack` with `type: PULUMI`. A Pulumi run logs in to the configured backend, selects or creates the configured stack, then runs the usual preview, apply, or destroy workflow.

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: example-pulumi-stack
  namespace: default
spec:
  type: PULUMI
  repositoryRef:
    name: infrastructure
    namespace: default
  clusterRef:
    name: mgmt
    namespace: infra
  git:
    ref: main
    folder: pulumi
  configuration:
    pulumi:
      stack: dev
      parallel: 10
      refresh: true
      approveEmpty: true
```

`configuration.pulumi.stack` defaults to `dev`. Omit `backendUrl` to use Pulumi Cloud, or set it to a Pulumi-supported self-managed backend URL. Unlike Terraform, `manageState` does not manage Pulumi state; configure the state backend with `backendUrl`.

For using the Plural Terraform provider from a Pulumi program, see [Using from Pulumi](/api-reference/terraform/pulumi).

## Pulumi Cloud

Pulumi Cloud is the default backend. Authenticate the runner with a `PULUMI_ACCESS_TOKEN` sourced from a Kubernetes Secret in the same namespace as the `InfrastructureStack`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pulumi-cloud-credentials
  namespace: default
type: Opaque
stringData:
  accessToken: YOUR-PULUMI-ACCESS-TOKEN
---
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: example-pulumi-cloud
  namespace: default
spec:
  type: PULUMI
  # repositoryRef, clusterRef, and git omitted
  environment:
    - name: PULUMI_ACCESS_TOKEN
      secretKeyRef:
        name: pulumi-cloud-credentials
        key: accessToken
```

Create access tokens in Pulumi Cloud for the organization that owns the project and stack. Do not put a token in `backendUrl`, Git, or a plain environment value.

## S3 and other self-managed backends

To use S3, set `backendUrl` and authenticate the runner to AWS. Workload identity is recommended: configure the stack runner's service account with EKS Pod Identity or IRSA, then select it with `jobSpec.serviceAccount`.

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: example-pulumi-s3
  namespace: default
spec:
  type: PULUMI
  # repositoryRef, clusterRef, and git omitted
  configuration:
    pulumi:
      stack: dev
      backendUrl: s3://YOUR-PULUMI-STATE-BUCKET?region=eu-central-1&awssdk=v2
  environment:
    - name: AWS_REGION
      value: eu-central-1
    - name: PULUMI_CONFIG_PASSPHRASE
      secretKeyRef:
        name: pulumi-state-credentials
        key: passphrase
  jobSpec:
    namespace: plrl-deploy-operator
    serviceAccount: stacks
```

The IAM identity must be allowed to read and write the state bucket. Do not set `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` when the runner has workload identity: static credentials take precedence and can prevent the AWS SDK from using the service account identity.

Pulumi's default secrets provider for self-managed object-store backends is a passphrase. Store a stable passphrase in a Kubernetes Secret and supply it as `PULUMI_CONFIG_PASSPHRASE`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pulumi-state-credentials
  namespace: default
type: Opaque
stringData:
  passphrase: REPLACE-WITH-A-STABLE-SECRET
```

Keep the same passphrase for every run that accesses a stack. Losing or changing it prevents Pulumi from decrypting existing stack configuration and secrets.

Other Pulumi-supported backends, such as GCS, Azure Blob Storage, and a self-hosted Pulumi Cloud service, are configured the same way: set `backendUrl`, then provide the backend's credentials to the runner through workload identity, a mounted credentials file, or a Secret-backed environment variable. A self-managed backend does not require `PULUMI_ACCESS_TOKEN` unless the selected backend itself requires it.

{% callout severity="warning" %}
`backendUrl` is normal stack configuration, not a secret field. Do not embed tokens, SAS credentials, or access keys in it. Keep credentials in Kubernetes Secrets or workload identity instead.
{% /callout %}

See {% doclink to="plural_features_stacks_iac_management_customize_runners" %}Customize stack runners{% /doclink %} for configuring workload identity and runner service accounts.
