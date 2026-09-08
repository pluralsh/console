---
title: At-Scale Infrastructure Testing with Sentinels
description: Automate testing over any set of Kubernetes Clusters with the Sentinel Resource
---

Validating the correctness of any infrastructure change is a meaningfully complex task that has no parallel to a local unit test that is effective at the application layer. Slight differences almost always require some degree of live integration testing.  Multiply this by n kubernetes clusters, for any large n, and you definitely need to automate.

Sentinels are meant to provide a flexible abstraction to solve for this.  In particular, they allow you to bundle a sequence of checks that can:

* Run terratest-based integration tests across any subset of your clusters and aggregate the results
* Tail logs across any set of clusters using search filters, and analyze it with AI and git-source rules files
* Deep-query a kubernetes resource on a cluster and analyze its health with AI and git-sourced rules files

Once a sentinel is defined, it can be run anytime on-demand via API.  This can be triggered:

* in our UI
* in github actions or other CI systems
* in Plural pipelines

Some common usecases that we find they are particularly well suited for are:

1. Validating kubernetes upgrades do not introduce regressions
2. Cross-cutting kubernetes operator changes (eg istio upgrades)
3. Validating network reconfigurations are safe.

But there are likely many more.

The motivation behind all of these, and the use of AI, is that oftentimes confirming infra health requires aggregating multiple textual datasources and interpreting them using some degree of discretion that consumes meaningful man-hours as a result.  You simply cannot do that deterministically, so a governed AI-based approach is needed.  For deterministic correctness, a full terratest run can exercise common paths like validating pods start, storage volumes can be mounted, networking is enabled, etc.

## Set Up Your First Sentinel

Defining a new sentinel is best done via CRD.  If you set up Plural with `plural up` you can register this at a file like `bootstrap/sentinels/example.yaml`:

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
To see the full api spec, go to our [Management API Docs](https://docs.plural.sh/overview/management-api-reference#sentinel)
{% /callout %}

What this particular sentinel will do when run is, in parallel:

1. Query the logs for the configured namespaces (cert-manager, external-dns, and kube-system, some common low-level operator namespaces) for 5m for errors, and then analyze any results found according to a rule file specified in git.  You as the engineer can tune how the AI operates with that rule file.
2. Launch our default terratest job across all `tier: dev` clusters, doing a basic sequence of health checks.

You can run a sentinel at any time in your Plural Console instance by navigating to `AI -> Sentinels -> {sentinel-name}`, and once run, you'll see an experience something like this:

![](/assets/ai/sentinel-landing.png)

![](/assets/ai/sentinel-open.png)

