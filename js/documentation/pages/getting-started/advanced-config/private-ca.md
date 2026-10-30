---
title: Handling private CAs
description: Configure certificate bundles in environments requiring a private CA
---

# Background

Some organizations use fully private DNS and certificate authorities which won't validate using standard OS certificate bundles. The Plural console and agent communicate over standard HTTPS, and all HTTP clients will fail without certificate validation.

The simplest approach is a **single Helm `certs` value** on the management console chart. That value:

- mounts a CA bundle into console and KAS pods
- seeds the same bundle into agent Helm values on bootstrap
- enables the deployment operator to mount the bundle on AgentRun, Stack, and Sentinel pods automatically

Prefer a **merged** `ca-certificates.crt` that includes your private chain **plus** public/browser-trusted roots so outbound TLS to both internal and public endpoints keeps working.

## Recommended: one `certs` value

```yaml
certs:
  - name: ca-bundle
    file: ca-certificates.crt
    data: |
      -----BEGIN CERTIFICATE-----
      ... private CA / intermediates ...
      -----END CERTIFICATE-----
      -----BEGIN CERTIFICATE-----
      ... public roots (or a full merged system bundle) ...
      -----END CERTIFICATE-----
```

During `plural cd control-plane`, you can point at an existing HTTPS host that uses your corp PKI; the CLI downloads the chain, merges public roots, and writes this field for you. You can also pass a PEM file for offline/local installs.

With that set:

1. Console and KAS pods mount `/etc/ssl/certs/ca-certificates.crt` from a chart ConfigMap.
2. If `console.config.agentHelmValues` is empty, Console seeds agents with the same `certs` and `spawnedWorkloads.caBundle.enabled: true`.
3. Agents mount the bundle on the operator and agentk containers, and replicate a ConfigMap (`plural-ca-bundle` by default) into namespaces where they create pods, mounting it on AgentRun / Stack / Sentinel workloads.

No per-AgentRuntime or InfrastructureStack volume templates are required for PKI when this path is used.

## Advanced: trust-manager

If you already operate cert-manager's trust-manager and prefer cluster-wide Bundles, that path still works. Install trust-manager per [cert-manager docs](https://cert-manager.io/docs/trust/trust-manager/installation/), create a Bundle with `useDefaultCAs: true` plus your private PEMs, then mount the resulting ConfigMap via `global.additionalVolumes` / `global.additionalVolumeMounts` (console) and agent `additionalVolumes` / `additionalVolumeMounts`.

```yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: plrl-bundle
spec:
  sources:
    - useDefaultCAs: true
    - inLine: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
  target:
    configMap:
      key: 'ca-certificates.crt'
```

Console mount example:

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

Agent Helm values (when not using the chart `certs` path):

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

## Manual pod templates (legacy)

If you are not on an agent version that auto-injects spawned CA mounts, you can still set volume mounts on `AgentRuntime.spec.template` and `InfrastructureStack.spec.jobSpec.raw` as before. Prefer upgrading agents and using `certs` + `spawnedWorkloads.caBundle` instead.
