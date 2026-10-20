---
title: Service templating
description: Applying on-the-fly configuration to your Plural services
---
# Overview

Plural provides several mechanisms to template service configuration into your YAML before it is applied to the destination cluster. There are a few key use cases for this:

- injecting cluster-level configuration into a service, like IRSA role ARNs or other information needed to configure authentication to cloud services
- injecting Plural secrets into service manifests
- injecting information from other tools passed from service contexts or Stack outputs

All templating is done via Shopify's [Liquid](https://shopify.github.io/liquid/) template engine. It's a mature templating language with generally better documentation than Go's native text/template. We also inject a subset of the Sprig library into the engine; you can see how it's configured [here](https://github.com/pluralsh/deployment-operator/blob/main/pkg/manifests/template/raw.go#L22).

It's important to know where templates can be applied and what data is available.

## Templatable files

The following files can have Liquid templating applied to them:

- YAML files in raw (non-Helm/Kustomize/etc.) services with a `.liquid` extension
- Helm values files ending in `.liquid`


## Available Data

You will have the following data fields available for templating:

- `configuration` - a `map[string]string` which contains any secrets configured for that service
- `cluster` - a stripped-down struct containing metadata about a cluster
- `imports` - imported data from Plural Stacks
- `service` - a stripped-down representation of the current service's spec, including name, namespace, and Helm settings like values and values files
- `contexts` - a `map[string]map[string]interface{}` containing a map of maps, keyed on context name. The contexts are usually created in other tools like Terraform, and can be bound to a service by name. See our {% doclink to="plural_features_stacks_iac_management_service_contexts" %}docs{% /doclink %} on Terraform interoperability to learn more

You can access them using `{{ }}`. For example, if you wanted to template a service secret into a Kubernetes secret, it might look something like:

```yaml
apiVersion: v1
kind: Secret
stringData:
  MY_SECRET: {{ configuration.secret }}
```

## Available Functions

You can find the list of all Liquid filter functions that we support {% doclink to="plural_features_service_templating_templating_filters" %}here{% /doclink %}.

## End-to-End Example

To get an idea of how this might work with a service secret, say we've already added the secret data to the management cluster like so:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: example-api-secrets
  namespace: infra
stringData:
  api-key: example-api-key
```

We then want to install a Helm chart that needs that API key as a Helm value. That would be done with our `ServiceDeployment` CRD, like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: example
  namespace: infra
spec:
  namespace: example
  git:
    folder: helm-values
    ref: main
  configurationRef:
    name: example-api-secrets # <- points to secret above
    namespace: infra # <- needs to be in the same namespace as the CR since we need to set a k8s owner reference
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  helm:
    version: "0.x.x"
    chart: example-chart
    valuesFiles:
    - example-chart.yaml.liquid # <- enable liquid templating in this values file
    repository:
      namespace: infra
      name: example-repo
  clusterRef:
    kind: Cluster
    name: my-cluster
    namespace: infra
```

Then at `helm-values/example-chart.yaml.liquid` (must be at that path since `spec.git.folder` is pointing to the `helm-values` folder), we'd add a values file like this:

```yaml
example:
  apiKey: {{ configuration.api-key }} # the keys from the secret are available in the `configuration` map here
```
