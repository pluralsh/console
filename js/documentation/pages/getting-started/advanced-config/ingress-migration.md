---
title: Migrating from ingress-nginx to Traefik
description: Move a management cluster from runtime chart 0.x (ingress-nginx) to 1.x (Traefik) without changing load balancers or DNS
---

## Overview

The Plural runtime chart installs the ingress controller for your management cluster. Starting with version 1.0.0 it ships [Traefik](https://traefik.io/traefik) instead of ingress-nginx, which upstream has retired. New `plural up` installs get Traefik automatically.

Existing installs are not upgraded on their own. `bootstrap/runtime.yaml` pins the chart to `0.x.x`, so your management cluster keeps running ingress-nginx until you opt in with the steps below.

Traefik serves the same `nginx` and `internal-nginx` ingress classes through its [ingress-nginx compatible provider](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress-nginx/). Your Ingress resources, including the console and KAS ingresses, don't need any changes, and the common `nginx.ingress.kubernetes.io/*` annotations keep working.

{% callout severity="info" %}
This guide applies to management clusters created with `plural up`. Plural Cloud and bring-your-own-cluster installs don't run the runtime chart's ingress controllers, so there's nothing to migrate.

Ingress controllers you deployed to workload clusters yourself, for example through a `bootstrap/network/ingress-nginx.yaml` global service, are separate from the runtime chart and aren't touched by this upgrade.
{% /callout %}

## What changes

- The ingress-nginx Deployments, ConfigMaps and RBAC are replaced by two Traefik Deployments: `runtime-traefik` (public, class `nginx`) and `runtime-traefik-private` (internal, class `internal-nginx`).
- The existing load balancer Services are adopted by Traefik, so the load balancers, their addresses and your DNS records stay the same.
- On AWS, Traefik reads the client IP from the PROXY protocol header the NLB sends and only trusts it from inside your VPC. Unlike ingress-nginx, `X-Forwarded-*` headers sent by clients are not trusted.

The switch causes a short outage while the Services move from the ingress-nginx pods to the new Traefik pods. In our tests on AWS this was about 20 seconds, so pick a quiet window.

## Migration steps

All changes happen in your Plural infra repo. Once you push them, the deployment operator rolls out the new chart.

### 1. Bump the runtime chart

In `bootstrap/runtime.yaml`, change the Helm version:

```yaml
spec:
  helm:
    version: "1.x.x"
    chart: runtime
    url: https://pluralsh.github.io/bootstrap
```

### 2. Rename the values keys

In `helm/runtime.yaml.liquid`, rename the `ingress-nginx` key to `traefik` and `ingress-nginx-private` to `traefik-private`. The settings under `controller:` are specific to ingress-nginx and can be removed. The chart's defaults already include the load balancer annotations for each cloud.

### 3. Keep the existing load balancers

Add the following to `helm/runtime.yaml.liquid` so Traefik takes over the Services ingress-nginx created, and publishes their address on your Ingresses:

```yaml
traefik:
  service:
    nameOverride: runtime-ingress-nginx-controller
  providers:
    kubernetesIngressNGINX:
      publishService:
        pathOverride: plural-runtime/runtime-ingress-nginx-controller
traefik-private:
  service:
    nameOverride: runtime-ingress-nginx-private-controller
  providers:
    kubernetesIngressNGINX:
      publishService:
        pathOverride: plural-runtime/runtime-ingress-nginx-private-controller
```

Without this, Traefik creates new load balancers, the old ones are deleted, and external-dns moves your DNS records to the new addresses. That causes a longer outage that depends on your DNS TTLs, and it changes your public IPs.

### 4. AWS only: trust the PROXY protocol header

The NLBs Plural creates on AWS send PROXY protocol headers, so Traefik has to trust your VPC range. Add this to `helm/runtime.yaml.liquid`:

```yaml
traefik:
  ports:
    web:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
    websecure:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
traefik-private:
  ports:
    web:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
    websecure:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
```

The value comes from `vpcCidr` in the `runtime-config` secret in the `infra` namespace and falls back to `10.0.0.0/16`, the default VPC range of `plural up`. If your VPC uses a different range, add it to the secret before you push:

```sh
kubectl -n infra patch secret runtime-config -p '{"stringData":{"vpcCidr":"<vpc cidr>"}}'
```

{% callout severity="warning" %}
If the trusted range doesn't cover your VPC, Traefik rejects the PROXY header and every request through the load balancer fails. Double-check the CIDR before pushing.
{% /callout %}

### 5. Commit and push

Commit both files and push them to the branch your infra repo syncs from. The deployment operator picks up the change, deploys the Traefik pods, switches the Services over to them and removes the ingress-nginx resources.

For reference, a migrated `helm/runtime.yaml.liquid` on AWS ends with:

```yaml
traefik:
  service:
    nameOverride: runtime-ingress-nginx-controller
  providers:
    kubernetesIngressNGINX:
      publishService:
        pathOverride: plural-runtime/runtime-ingress-nginx-controller
  ports:
    web:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
    websecure:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
traefik-private:
  service:
    nameOverride: runtime-ingress-nginx-private-controller
  providers:
    kubernetesIngressNGINX:
      publishService:
        pathOverride: plural-runtime/runtime-ingress-nginx-private-controller
  ports:
    web:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
    websecure:
      proxyProtocol:
        trustedIPs:
        - {{ configuration.vpcCidr | default: '10.0.0.0/16' }}
```

On GCP and Azure, leave out the `ports` blocks.

## Verifying the migration

Once the `runtime` service shows as healthy in the console, check that:

- the Traefik pods are running and the ingress-nginx ones are gone:

  ```sh
  kubectl -n plural-runtime get pods
  ```

- both Services still have their original load balancer address, now selecting the Traefik pods:

  ```sh
  kubectl -n plural-runtime get svc runtime-ingress-nginx-controller runtime-ingress-nginx-private-controller -o wide
  ```

- your Ingresses still show the same address:

  ```sh
  kubectl get ingress -A
  ```

- the console loads, and the Kubernetes dashboard in the console works for your clusters, which confirms the KAS connection from the agents.

On AWS, you can also confirm that real client IPs come through by checking the `ClientHost` field in the Traefik access log:

```sh
kubectl -n plural-runtime logs deploy/runtime-traefik --tail=100
```

You should see public client addresses there, not addresses from your VPC range.
