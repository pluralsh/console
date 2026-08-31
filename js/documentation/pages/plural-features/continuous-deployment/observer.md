---
title: Plural Observers in Continuous Deployment
description: Detect upstream changes and automatically trigger deployments, enabling fast, event-driven continuous delivery.
---

Plural’s Observer framework implements the Observer Pattern, automatically watching external sources and triggering deployments
based on detected changes. This eliminates the need for manual intervention when new versions of applications or dependencies are released.

## Overview of Plural Observers
Plural’s Observer CRD (Observer resource) defines:
 - What to watch: External targets like Git repositories, Helm registries, OCI registries, or Plural add-ons.
 - How often to poll: Using a crontab schedule.
 - What actions to perform: Launch a pipeline or open a pull request when changes are discovered.

This event-driven model integrates tightly with GitOps practices, ensuring deployments stay in sync with upstream artifacts dynamically and safely.

## Available Observer Target Types

There are a variety of observer scrape targets that an action can act upon are:

* `HELM` - scrape a helm chart and act on new versions
* `GIT` - scrape a git repo in plural and act on new tags
* `ADDON` - scrape a Plural addon-compatibility table and act on new versions compatible with a list of kubernetes versions
* `EKS_ADDON` - scape a Plural eks addon compatibility table and act on new versions compatible with a list of kubernetes versions

{% callout severity="info" %}
The last two are often the most useful, and can automate almost all the addon version maintenance related to kubernetes upgrades.
{% /callout %}

## Available Observer Actions

Observers currently can execute two actions:

* `PIPELINE` - add a new PipelineContext to a Plural Pipeline, this is useful for triggering a promotion pipeline for new addons
* `PR` - trigger a Plural PR Automation: this is really useful for gluing the Observer automation into legacy IaC and GitOps code.

{% callout severity="info" %}
PR Automations can modify any codebase with the right templating, and you can leverage that to automate version maintenance irrespective of how embedded Plural is in your infra.
{% /callout %}

## Scraping OCI Registries with Observers
Plural observers can scrape OCI-based repositories (e.g., container image repositories or Helm charts stored in OCI format).
Here’s how this works:
 - Target Type: OCI
 - Configuration:
  - URL: The address of the OCI repository to scrape.
  - Optional authentication (BASIC, AWS, GCP, Bearer, Azure).
 - Polling: Using a cron schedule, the observer lists tags or artifacts.
 - Version Extraction: (Optional) A regex can be defined to match semantic versions (v1.2.3).

The observer will detect newly published tags or versions, compare them with previously seen ones, and if a new version is found, it will trigger actions based on the configuration.

### Setup
You can configure an Observer resource to monitor an OCI Helm chart repository or container image registry.
When a new artifact (matching a version format) appears, the Observer will trigger a Pipeline to handle the deployment.

```yaml
apiVersion: platform.plural.sh/v1alpha1
kind: Observer
metadata:
  name: my-oci-observer
spec:
  crontab: "*/15 * * * *"
  target:
    type: OCI
    order: SEMVER
    format: "v([0-9]+\\.[0-9]+\\.[0-9]+)"
    oci:
      url: "oci://ghcr.io/my-org/my-helm-chart"
      provider: BASIC
      auth:
        basic:
          username: "test"
          passwordSecretKeyRef:
            name: oci-auth-secret
            key: password
  actions:
    - type: PIPELINE
      configuration:
        pipeline:
          pipelineRef:
            name: my-deploy-pipeline
          context:
            version: "$value",
            releaseName: "my-app-release"
```

If the OCI registry requires authentication, create a Kubernetes secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: oci-auth-secret
type: Opaque
stringData:
  password: mypassword
```

### Behavior Summary
 - The Observer polls the OCI repository every 15 minutes.
 - It extracts versions matching a semantic version regex.
 - When a new version is found, it triggers a pre-configured Pipeline.
 - The new version value is passed to the pipeline’s context dynamically.
 
 ## Observer Output Types

 Here is a summary of the templatable outputs for various observer types:

| type      | outputs                                  | Explanation                                                                               |
|-----------|------------------------------------------|-------------------------------------------------------------------------------------------|
| OCI       | $value                                | OCI version found                                                                         |
| HELM      | $value                                | HELM chart version found                                                                  |
| GIT       | $value                                | GIT tag/commit found                                                                      |
| ADDON     | $value, $images, $chartVersion, $version | $value/$chartVersion: chart version<br/>$images: all detected images in the chart (JSON)<br/>$version: app version |
| EKS_ADDON | $value, $version                     | $value/$version: EKS addon version                                                      |