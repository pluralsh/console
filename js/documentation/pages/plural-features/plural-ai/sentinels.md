---
title: At-Scale Infrastructure Testing with Sentinels
description: Automate testing over any set of Kubernetes Clusters with the Sentinel Resource
---

Validating the correctness of any infrastructure change is a meaningfully complex task, with no equivalent of the local unit tests that work well at the application layer. Slight differences almost always require some degree of live integration testing.  Multiply this by n Kubernetes clusters, for any large n, and you definitely need to automate.

Sentinels provide a flexible abstraction to solve this.  In particular, they allow you to bundle a sequence of checks that can:

* Run terratest-based integration tests across any subset of your clusters and aggregate the results
* Tail logs across any set of clusters using search filters, and analyze them with AI and git-sourced rules files
* Deep-query a Kubernetes resource on a cluster and analyze its health with AI and git-sourced rules files

Once a sentinel is defined, it can be run on demand at any time via API.  This can be triggered:

* in our UI
* in GitHub Actions or other CI systems
* in Plural pipelines

Some common use cases they are particularly well suited for are:

1. Validating that Kubernetes upgrades do not introduce regressions
2. Cross-cutting Kubernetes operator changes (e.g. Istio upgrades)
3. Validating that network reconfigurations are safe

But there are likely many more.

The motivation behind all of these, and the use of AI, is that confirming infra health often requires aggregating multiple textual data sources and interpreting them with some degree of discretion, which consumes meaningful man-hours.  You cannot do that deterministically, so a governed AI-based approach is needed.  For deterministic correctness, a full terratest run can exercise common paths like validating pods start, storage volumes can be mounted, networking is enabled, etc.

## Set Up Your First Sentinel

Defining a new sentinel is best done via CRD.  If you set up Plural with `plural up`, you can register it in a file like `bootstrap/sentinels/example.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Sentinel
metadata:
  name: example
spec:
  description: Test baseline kubernetes health
  repositoryRef:
    name: infra
    namespace: infra
  git:
    ref: main
    folder: rules
  checks:
    - name: console-logs
      type: LOG
      ruleFile: logrule.md
      configuration:
        log:
          query: error
          duration: 5m
          namespaces:
          - cert-manager
          - external-dns
          - kube-system
    - name: integration-tests
      type: INTEGRATION_TEST
      configuration:
        integrationTest:
          format: JUNIT
          tags:
            tier: dev
          
          # notice no job image is specified, we ship with a working integration test out of the box that can be used
          # without upfront development.
          jobSpec:
            namespace: plrl-deploy-operator
            serviceAccount: deployment-operator
```

{% callout severity="info" %}
To see the full API spec, go to our [Management API Docs](https://docs.plural.sh/overview/management-api-reference#sentinel)
{% /callout %}

When run, this sentinel will do the following in parallel:

1. Query the logs of the configured namespaces (cert-manager, external-dns, and kube-system, some common low-level operator namespaces) over the last 5m for errors, then analyze any results according to a rule file specified in git.  You as the engineer can tune how the AI operates with that rule file.
2. Launch our default terratest job across all `tier: dev` clusters, doing a basic sequence of health checks.

You can run a sentinel at any time in your Plural Console instance by navigating to `AI -> Sentinels -> {sentinel-name}`. Once it runs, you'll see something like this:

![](/assets/ai/sentinel-landing.png)

![](/assets/ai/sentinel-open.png)

## Custom Integration Test Cases

The default terratest suite checks that basic workloads (pods, deployments, services, jobs and statefulsets) come up healthy. Most fleets also depend on cluster-specific infrastructure like cloud load balancers, CSI storage classes, and in-cluster DNS. You can test those without writing any Go code by adding `cases` to an `INTEGRATION_TEST` check.

Here's a sentinel validating a fleet of EKS clusters:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Sentinel
metadata:
  name: demo-fleet
spec:
  description: Test sentinel for demo fleet
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  git:
    ref: main
    folder: rules
  checks:
    - name: integration-tests
      type: INTEGRATION_TEST
      configuration:
        integrationTest:
          format: JUNIT
          tags:
            tier: dev
            fleet: demo
          cases:
          - type: LOADBALANCER
            name: test-lb
            loadbalancer:
              namespace: default
              namePrefix: test-lb
              annotations:
                service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
                service.beta.kubernetes.io/aws-load-balancer-type: external
                service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: instance
          - type: PVC
            name: test-pvc
            pvc:
              namePrefix: test-pvc
              size: 1Gi
              storageClass: ebs-csi-default-sc
          - type: COREDNS
            name: test-coredns
            coredns:
              dialFqdns:
              - cert-manager.cert-manager
              - cert-manager-webhook.cert-manager
          jobSpec:
            namespace: plrl-deploy-operator
            serviceAccount: deployment-operator
```

On every cluster tagged `tier: dev` and `fleet: demo`, the test job runs the default suite and then each case in parallel. Each case is reported as its own test in the JUnit results. The job creates its test resources with its service account, so that account needs permission to create namespaces and the resources under test. The `deployment-operator` service account used here already has it.

### Case types

**`LOADBALANCER`** creates a `LoadBalancer` Service named `{namePrefix}-svc-{random}` in a temporary namespace, with the `annotations` and `labels` you specify. The test passes once the cloud provider assigns the Service an ingress address. In the example above, the annotations ask the AWS Load Balancer Controller for an internet-facing NLB, so the case confirms the controller is installed, has IAM permissions, and can reach the subnets it needs.

To also check external-dns, add a `dnsProbe`. The test then waits until the FQDN resolves to one of the load balancer's addresses:

```yaml
- type: LOADBALANCER
  name: test-lb-dns
  loadbalancer:
    namespace: default
    namePrefix: test-lb
    annotations:
      external-dns.alpha.kubernetes.io/hostname: sentinel-test.dev.example.com
    dnsProbe:
      fqdn: sentinel-test.dev.example.com
      delay: 10s
      retries: 30
```

The probe always waits at least 2 minutes. If `delay` × `retries` adds up to less than that, it falls back to 24 retries at 5 second intervals.

**`PVC`** creates a PersistentVolumeClaim of the given `size` and `storageClass` in a temporary namespace. It also starts a busybox pod that mounts the claim, writes a file and reads it back. The test passes once the claim is bound and the pod succeeds. This proves that dynamic provisioning, attach, and mount all work for that storage class, which commonly breaks after CSI driver or Kubernetes upgrades.

**`COREDNS`** resolves each hostname in `dialFqdns` from inside the test pod, retrying for up to 2 minutes. Each hostname is reported as its own subtest. Use short `service.namespace` names to confirm in-cluster service discovery works for services you depend on. In the example above, that's the cert-manager webhook, which, if unreachable, blocks every Certificate apply. You can also list external hostnames to check upstream resolution.

**`RAW`** applies arbitrary Kubernetes YAML and checks the result. If `expectedResult` is `SUCCESS` (the default), the apply must succeed and every resource must become ready within 15 minutes. If it's `FAILED`, the apply must be rejected. This makes it easy to verify that admission policies like Kyverno or Gatekeeper are enforced across a fleet:

```yaml
- type: RAW
  name: privileged-pods-blocked
  raw:
    expectedResult: FAILED
    yaml:
      apiVersion: v1
      kind: Pod
      metadata:
        name: sentinel-privileged
        namespace: default
      spec:
        containers:
        - name: test
          image: busybox
          securityContext:
            privileged: true
```

`yaml` takes a single Kubernetes object. To apply several, wrap them in a `kind: List`. Unlike the other case types, raw resources aren't put in a temporary namespace, so set `metadata.namespace` explicitly. They're deleted when the case finishes.

### Configuring test resources

The `default` block customizes the temporary namespaces and resources created by the `LOADBALANCER` and `PVC` cases:

```yaml
integrationTest:
  format: JUNIT
  default:
    namespaceLabels:
      pod-security.kubernetes.io/enforce: privileged
    resourceLabels:
      policy.example.com/exempt: "true"
    registry: my-registry.example.com/mirror # pull test images from a mirror, keeping image names and tags
  cases:
    ...
```

The label and annotation settings (`namespaceLabels`, `namespaceAnnotations`, `resourceLabels`, `resourceAnnotations`) help when test resources would otherwise be blocked by your admission policies. `registry` rewrites the image of the pod the `PVC` case starts, which is useful for clusters without public internet access.

To run only your cases and skip the default terratest suite, set `default.ignore: true`. Currently this also turns off the label, annotation, and registry settings above.

### Custom Go tests

If you need logic YAML can't express, add a `repositoryRef` and `git` to the `integrationTest` configuration, pointing at a folder of Go test code. The harness fetches that folder and runs it with `gotestsum` next to the default suite and any `cases`. If you need extra tools or dependencies, you can instead build your own image on top of `ghcr.io/pluralsh/sentinel-harness` and set it as the `image` of the `default` container in `jobSpec`.

