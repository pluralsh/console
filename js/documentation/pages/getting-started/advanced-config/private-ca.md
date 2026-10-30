---
title: Handling private CAs
description: Configure certificate bundles in environments requiring a private CA
---

# Background

Some organizations use fully private DNS and certificate authorities which won't validate using standard OS certificate bundles. The Plural console and agent communicate over standard HTTPS, and all HTTP clients will fail without certificate validation. The simplest way to manage this (and to manage private CAs generally) is to reconfigure the certificate bundles of the various apps. There are three main steps to this:

- set up cert-manager's trust-manager in the relevant cluster(s)
- configure a ConfigMap volume to `/etc/ssl/certs` to be mounted to all deployments for your management console
- configure your agents to use a similar ConfigMap volume

## Installing Trust Manager

trust-manager is a simple operator in the cert-manager ecosystem that collates certificate bundles and writes them to Secrets or ConfigMaps. Certificates are not usually sensitive information, so storing them in ConfigMaps is still within best practices, and that will be how we manage it in this tutorial.

To install trust-manager, you can follow cert-manager's docs [here](https://cert-manager.io/docs/trust/trust-manager/installation/). It does require an installation of cert-manager as well. Once the operator is installed, you'll want to create a bundle resource, like so:

```yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: plrl-bundle
spec:
  sources:
    - useDefaultCAs: true
    - inLine:
        | # simple way to specify additional certificates, trust manager supports other sources too
        -----BEGIN CERTIFICATE-----
        MIIC5zCCAc+gAwIBAgIBADANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDEwprdWJl
        ....
        0V3NCaQrXoh+3xrXgX/vMdijYLUSo/YPEWmo
        -----END CERTIFICATE-----
  target:
    configMap:
      key: 'ca-certificates.crt'
```

This will create a ConfigMap named `plrl-bundle` in every namespace, which can then be used by any workload; in this case, we'll focus on the main Plural-specific resources to configure.

Note: once you have all these set up and all agents are healthy, you can use Plural to manage these resources long-term.

## Configure your Console

Our Helm chart allows you to reconfigure volumes and volumeMounts globally, which we'll use to mount the cert bundle into `/etc/ssl/certs` for all relevant pods. The Helm YAML needed would be:

```yaml
global:
  additionalVolumes:
    - name: ca-certificate-only
      configMap:
        name: plrl-bundle
        defaultMode: 0644
        optional: false
        items:
          - key: ca-certificates.crt
            path: ca-certificates.crt
  additionalVolumeMounts:
    - mountPath: /etc/ssl/certs/
      name: ca-certificate-only
      readOnly: true
```

If you use our CRDs to self-manage your console install as well, you can add these values using the `helm.values` field in the `ServiceDeployment` spec like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: console
  namespace: infra
spec:
  namespace: plrl-console # this namespace must be correct
  name: console
  helm:
    version: 0.9.x
    chart: console
    values:
      global:
        additionalVolumes:
          - name: ca-certificate-only
            configMap:
              name: plrl-bundle # note this is the same name as the Bundle defined above
              defaultMode: 0644
              optional: false
              items:
                - key: ca-certificates.crt
                  path: ca-certificates.crt
        additionalVolumeMounts:
          - mountPath: /etc/ssl/certs/
            name: ca-certificate-only
            readOnly: true
    valuesFrom:
      namespace: plrl-console
      name: console-values
    repository:
      namespace: infra
      name: console
  clusterRef:
    kind: Cluster
    name: mgmt
    namespace: infra
```

(See the existing cluster installation docs for more details on the configuration of this CRD)

## Configure your agents

The agent similarly allows for configuring volumes/volumeMounts. You'll want to modify your installation to use custom values. This involves modifying the global agent settings for your installation, then passing custom values as you install the agent via CLI or Terraform. The documentation {% doclink to="getting_started_advanced_config_sandboxing" %}here{% /doclink %} should provide a good overview of how to do this, geared towards customizing Docker image registries.

The specific values to bind the CA bundle to the agent container would be:

```yaml
additionalVolumes:
  - name: ca-certificate-only
    configMap:
      name: plrl-bundle
      defaultMode: 0644
      optional: false
      items:
        - key: ca-certificates.crt
          path: ca-certificates.crt
additionalVolumeMounts:
  - mountPath: /etc/ssl/certs/
    name: ca-certificate-only
    readOnly: true
```

## Configuring Operator-Driven Pod Creation

Plural's deployment-operator can spawn pod-like workloads through three means:

1. InfrastructureStacks - for running IaC like Terraform
2. AgentRuntimes - for running coding agents
3. Sentinels - for running integration tests across your clusters

All of these support providing a full pod template to customize their generated pods. Here's an example of how it would work:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: AgentRuntime
metadata:
  name: codex
  namespace: agents
spec:
  targetNamespace: agents
  type: CODEX
  aiProxy: true
  template:
    spec:
      containers:
      - name: default # the main agent container
        volumeMounts:
        - mountPath: /etc/ssl/certs/
          name: ca-certificate-only
          readOnly: true
      initContainers:
      - name: agent-bootstrap # init container that clones the repo
        volumeMounts:
        - mountPath: /etc/ssl/certs/
          name: ca-certificate-only
          readOnly: true
      - name: mcpserver # sidecar mcp server for plural-specific tools
        volumeMounts:
        - mountPath: /etc/ssl/certs/
          name: ca-certificate-only
          readOnly: true
      volumes:
      - name: ca-certificate-only
        configMap:
          name: plrl-bundle
          defaultMode: 0644
          optional: false
          items:
            - key: ca-certificates.crt
              path: ca-certificates.crt
```

Similarly, for stacks:


```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: example
  namespace: infra
spec:
  ...
  jobSpec:
    raw:
      template:
        spec:
          containers:
          - name: default # the main stack run container
            volumeMounts:
            - mountPath: /etc/ssl/certs/
              name: ca-certificate-only
              readOnly: true
          volumes:
          - name: ca-certificate-only
            configMap:
              name: plrl-bundle
              defaultMode: 0644
              optional: false
              items:
                - key: ca-certificates.crt
                  path: ca-certificates.crt
```

And for sentinel integration tests. The simplified `containers` form of a sentinel `jobSpec` doesn't support volume mounts, so use `raw` instead. In raw mode, the namespace and service account are read from the pod template, and a container named `default` with no image runs the standard sentinel test harness:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Sentinel
metadata:
  name: example
spec:
  ...
  checks:
    - name: integration-tests
      type: INTEGRATION_TEST
      configuration:
        integrationTest:
          format: JUNIT
          tags:
            tier: dev
          jobSpec:
            namespace: plrl-deploy-operator
            raw:
              template:
                metadata:
                  namespace: plrl-deploy-operator # the namespace the test job runs in
                spec:
                  serviceAccountName: deployment-operator
                  containers:
                  - name: default # the main sentinel test container, set `image` to use your own test harness
                    volumeMounts:
                    - mountPath: /etc/ssl/certs/
                      name: ca-certificate-only
                      readOnly: true
                  volumes:
                  - name: ca-certificate-only
                    configMap:
                      name: plrl-bundle
                      defaultMode: 0644
                      optional: false
                      items:
                        - key: ca-certificates.crt
                          path: ca-certificates.crt
```