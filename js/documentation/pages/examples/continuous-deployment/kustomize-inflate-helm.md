---
title: Use Kustomize to inflate a Helm chart
description: 'Learn how to deploy WordPress using Kustomize to inflate Helm charts, combining the power of Helm for packaging and Kustomize for customization'
---
## Overview
In this guide, you'll learn how to deploy WordPress on your Kubernetes cluster using Plural with Kustomize to inflate Helm charts.
This approach combines the power of Helm for packaging applications with Kustomize for customization, giving you more flexibility
in managing your deployments. You'll see how to use Liquid templates to generate secrets and configuration values, making your
deployments more secure and maintainable.

## Prerequisites

Before you begin, make sure to cover [prerequisites and setup](../#prerequisites).

## Step-by-Step Guide: Deploying WordPress with Kustomize and Helm
Let's walk through deploying WordPress using Kustomize to inflate Helm charts. Feel free to adjust provided file
examples according to your needs and commit them to your configured Git repository.

### Step 1: Create a GeneratedSecret resource
First, we'll create a `GeneratedSecret` resource to generate secure credentials for our WordPress deployment.

##### [apps/examples/kustomize-inflate-helm/generatedsecret.yaml.liquid](#TODO)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GeneratedSecret
metadata:
  name: plrl-04-wordpress-config
  namespace: examples
spec:
  destinations:
    - name: plrl-04-wordpress-config
      namespace: examples
  template:
    dbUser: admin
    dbPassword: '{{ "{{ 32 | randAlphaNum " }}}}'
    dbRootPassword: '{{ "{{ 32 | randAlphaNum " }}}}'
    dbReplicationPassword: '{{ "{{ 32 | randAlphaNum " }}}}'
    dbName: 'bitnami_wordpress'
    dbSecret: 'wordpress-mariadb'
    wordpressSecret: 'wordpress'
    wordpressPassword: '{{ "{{ 32 | randAlphaNum " }}}}'
```

### Step 2: Set up Kustomize with Helm
Now, let's set up Kustomize to inflate the Helm chart. We'll create a directory structure with the following files:

##### [services/examples/kustomize-inflate-helm/kustomization.yaml](#TODO)
```yaml
resources:
  - secret.yaml
helmGlobals:
  chartHome: .
helmCharts:
  # Must match the directory name with the unpacked chart.
  # There is a 'wordpress.tar' in this directory that contains a packed chart.
  # It needs to be unpacked first to the same directory as `kustomization.yaml`
  # to be used.
  - name: wordpress
    releaseName: wordpress
    namespace: examples
    valuesFile: values.yaml
```

##### [services/examples/kustomize-inflate-helm/values.yaml.liquid](#TODO)
```yaml
service:
  type: ClusterIP

  auth:
    database: {{ configuration.dbName }}
    username: {{ configuration.dbUser }}
    existingSecret: {{ configuration.dbSecret }}
```

##### [services/examples/kustomize-inflate-helm/secret.yaml.liquid](#TODO)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ configuration.dbSecret }}
stringData:
  mariadb-root-password: '{{ configuration.dbRootPassword }}'
  mariadb-replication-password: '{{ configuration.dbReplicationPassword }}'
  mariadb-password: '{{ configuration.dbPassword }}'
---
apiVersion: v1
kind: Secret
metadata:
  name: {{ configuration.wordpressSecret }}
stringData:
  wordpress-password: '{{ configuration.wordpressPassword }}'
```

##### [services/examples/kustomize-inflate-helm/wordpress](#TODO)
You'll also need to include the WordPress Helm chart in your repository. You can download it from the official Helm repository and include it in your Git repository
or download a linked `wordpress.tar` and unpack it in the above path. It will create a `wordpress` directory with the chart inside. It's been vendored from the official 
bitnami wordpress.

### Step 3: Create a ServiceDeployment resource
Finally, we'll create a ServiceDeployment resource that uses Kustomize to inflate the Helm chart.

##### [apps/examples/kustomize-inflate-helm/servicedeployment.yaml](#TODO)
```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: plrl-04-wordpress
  namespace: examples
spec:
  cluster: mgmt
  git:
    url: https://github.com/yourorg/example.git # the url for your example git repo
    folder: services/examples/kustomize-inflate-helm
    ref: main
  kustomize:
    path: '.'
    enableHelm: true
  configurationRef:
    name: plrl-04-wordpress-config
    namespace: examples
```

### Step 4: Check Plural Console and access WordPress
After a couple of minutes, the service should be deployed and running. You can check the status in the Plural Console.

![](/assets/examples/plrl-04-console.png 'CD tab -> mgmt cluster -> plrl-04-wordpress service')

You can access your `wordpress` instance using i.e. `kubectl`.
```shell
kubectl -n examples port-forward svc/wordpress 8080:80
```

It will be accessible at `localhost:8080`.
![](/assets/examples/plrl-wordpress.png 'localhost:8080')

## Key Takeaways
Congratulations! You've just learned how to:
- Deploy WordPress using Kustomize to inflate Helm charts
- Generate secure credentials using GeneratedSecret
- Use Liquid templates to customize your deployment
- Combine the power of Helm for packaging and Kustomize for customization

This approach gives you more flexibility in managing your deployments, allowing you to:
- Use existing Helm charts without modifying them
- Apply Kustomize patches to customize the Helm chart output
- Generate secure credentials and configuration values using Liquid templates
- Manage complex deployments with a clear separation of concerns

Need help? Join our community [Discord server](https://discord.com/invite/bEBAMXV64s) or check out more examples in our documentation.
