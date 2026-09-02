---
title: Deploy a Helm chart with inline values
description: 'Learn how to deploy a Grafana instance using Helm chart with inline configuration values, including ingress setup and TLS configuration'
---

## Overview

In this guide, you'll learn how to deploy Grafana (a popular monitoring tool) on your Kubernetes cluster using Plural.
We'll show you how to use Helm charts - think of them as pre-packaged applications - with inline configuration values,
which means we'll define all our settings directly in the deployment file. This approach makes it easy to manage and
update your applications.

## Prerequisites

Before you begin, make sure to cover [prerequisites and setup](../#prerequisites), and that you have:
- `cert-manager`, ingress controller and `externaldns` installed in the target cluster.

{% callout severity="info" %}
When using `plural up` and the `mgmt` as the target cluster `cert-manager`, `nginx-ingress` and `externaldns` will already be installed.
{% /callout %}

## Step-by-Step Guide: Deploying Grafana with Inline Helm Values
Let's walk through deploying Grafana using a Helm chart with inline configuration values. Feel free to adjust provided file
examples according to your needs and commit them to your configured Git repository under the `apps` directory. There is a
default `apps` service that deploys all resources from that directory.

### Step 1: Create a ServiceDeployment resource
Create our service deployment that uses a remote helm chart and inline values to deploy a fully
functional Grafana instance.

##### [apps/examples/helm-basic-with-inline-values/servicedeployment.yaml](https://github.com/pluralsh/scaffolds/blob/main/examples/helm-basic-with-inline-values/servicedeployment.yaml)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: plrl-01-grafana
  namespace: examples
spec:
  cluster: mgmt
  helm:
    # Remote helm repository
    url: https://grafana.github.io/helm-charts
    # Chart within that repository that should be deployed
    chart: grafana
    # Version can use an exact version or 'x' to allow patch/minor/major version bumps without user interaction
    version: x.x.x  # Replace with your desired version or leave as is to always use the latest version
    values:
      # Our custom inline values
      ingress:
        enabled: true
        annotations:
          cert-manager.io/cluster-issuer: plural
        ingressClassName: nginx
        hosts:
          - grafana-test.your-domain.com
        tls:
          - hosts:
              - grafana-test.your-domain.com
            secretName: grafana-tls
```

### Step 2: Check Plural Console and access Grafana
After a couple of minutes, service should be deployed and running. 
![](/assets/examples/plrl-01-console.png 'CD tab -> mgmt cluster -> plrl-01-grafana service')

Grafana should now be accessible at the configured address.
![](/assets/examples/plrl-grafana.png 'https://grafana-test.your-domain.com')

## Key Takeaways

Congratulations! You've just learned how to:

- Deploy an application (Grafana) using Helm charts in Plural
- Connect your deployment to a specific cluster
- Configure your application using inline values (settings written directly in the file)
- Set up secure access to your application with TLS (https)
- Monitor your deployment using Plural Console

This example shows you the basics of deploying applications on Plural. You can use this same approach to deploy other
applications - just change the Helm chart and adjust the configuration values to match your needs. Remember, the Plural
Console is always there to help you monitor and manage your deployments.

Need help? Join our community [Discord server](https://discord.com/invite/bEBAMXV64s) or check out more examples in our documentation.

