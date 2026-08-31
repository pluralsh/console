---
title: Deploy a helm chart with git-sourced values file
description: 'Learn how to deploy a Grafana instance using Helm chart with configuration values stored in a separate values file, including ingress setup and TLS configuration'
---

## Overview

In this guide, you'll learn how to deploy Grafana (a popular monitoring tool) on your Kubernetes cluster using Plural.
We'll show you how to use Helm charts - think of them as pre-packaged applications - with configuration values stored in a separate values file.
This approach helps separate configuration from deployment logic, making it easier to manage complex deployments and track
configuration changes over time.

## Prerequisites

Before you begin, make sure to cover [prerequisites and setup](../#prerequisites), and that you have:
- `cert-manager`, ingress controller and `externaldns` installed in the target cluster.

{% callout severity="info" %}
When using `plural up` and the `mgmt` as the target cluster `cert-manager`, `nginx-ingress` and `externaldns` will already be installed.
{% /callout %}

## Step-by-Step Guide: Deploying Grafana with External Values File
Let's walk through deploying Grafana using a Helm chart with an external values file. Feel free to adjust provided file
examples according to your needs and commit them to your configured Git repository under the `apps` directory. There is a
default `apps` service that deploys all resources from that directory.

### Step 1: Create values file for your Grafana configuration
Create a separate values file to store your Grafana configuration. This approach keeps your configuration neatly separated from the deployment definition.

##### [helm-values/plrl-02-grafana.yaml.liquid](https://github.com/pluralsh/scaffolds/blob/main/examples/helm-basic-with-values-file/helm-values/plrl-02-grafana.yaml.liquid)
```yaml
# Custom values for Grafana
ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: plural
  ingressClassName: nginx
  
  hosts:
    - {{ configuration.host }}

  tls:
    - hosts:
        - {{ configuration.host }}
      secretName: grafana-tls
```
### Step 2: Create a ServiceDeployment resource
Next, create your service deployment that references the external values file you just created.

##### [apps/examples/helm-basic-with-values-file/servicedeployment.yaml](https://github.com/pluralsh/scaffolds/blob/main/examples/helm-basic-with-values-file/servicedeployment.yaml)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: plrl-02-grafana
  namespace: examples
spec:
  cluster: mgmt
  git:
    url: https://github.com/yourorg/example.git # the url for your example git repo
    # A directory in the git repository with the values file
    folder: helm-values
    ref: main
  helm:
    # Remote helm repository
    url: https://grafana.github.io/helm-charts
    # Chart within that repository that should be deployed
    chart: grafana
    # Version can use an exact version or 'x' to allow patch/minor/major version bumps without user interaction
    version: x.x.x  # Replace with your desired version or leave as is to always use the latest version
    # Reference to our external values file
    valuesFiles:
      # a relative path to the values file based on the configured git folder
      - plrl-02-grafana.yaml.liquid
  # inline configuration that will be passed as a context to the liquid helm values file
  configuration:
    host: 'grafana-test.your-domain.com'
```

### Step 3: Check Plural Console and access Grafana
After a couple of minutes, service should be deployed and running.
![](/assets/examples/plrl-02-console.png 'CD tab -> mgmt cluster -> plrl-02-grafana service')

Grafana should now be accessible at the configured address.
![](/assets/examples/plrl-grafana.png 'https://grafana-test.your-domain.com')

## Advantages of External Values Files
Using external values files offers several benefits:
1. **Separation of concerns** - Keep deployment logic separate from configuration
3. **Reusability** - Reuse the same values file for multiple deployments
4. **Security** - Store sensitive configuration in separate, properly secured files
5. **Readability** - Maintain cleaner, more organized deployment files

## Key Takeaways
Congratulations! You've just learned how to:
- Deploy an application (Grafana) using Helm charts in Plural
- Store and manage configuration in an external values file
- Connect your deployment to a specific cluster
- Set up secure access to your application with TLS (https)
- Monitor your deployment using Plural Console

This approach scales well for managing complex applications or multiple deployments. As your configuration grows, you can further organize your values files by splitting them into environment-specific versions or by application component.

Need help? Join our community [Discord server](https://discord.com/invite/bEBAMXV64s) or check out more examples in our documentation.
