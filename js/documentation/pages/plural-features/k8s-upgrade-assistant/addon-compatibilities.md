---
title: Add-on compatibilities
description: Keep your add-ons compatible with next Kubernetes version
---

Ensuring add-on compatibility across different Kubernetes versions can be challenging as it requires careful planning,
thorough testing, and continuous maintenance to address the evolving nature of Kubernetes and its ecosystem.
Learn how Plural can assist you in that process.

# Compatibility scraping
Plural helps in ensuring that all known third-party add-ons are compatible with the next Kubernetes version
by systematically scraping multiple sources for compatibility information. This includes gathering data from
official documentations, GitHub repositories, and other relevant sources. By consolidating this information,
we create a comprehensive database of add-on compatibility details.

# Checking add-on compatibilities
Add-on compatibility data is then made accessible through the Plural Console, where you can easily check
the compatibility status of your add-ons with upcoming Kubernetes versions. This proactive approach helps
to avoid potential issues caused by API changes and other version-specific nuances, ensuring a smoother
transition to newer Kubernetes releases.

    ![addon-compatibilities](/assets/deployments/addon-compatibilities.png)

    ![addon-compatibilities-details.png](/assets/deployments/addon-compatibilities-details.png)

# Automating Deployments on Newly Discovered Add-On Versions

Plural's [Observer](https://docs.plural.sh/getting-started/how-to-use/pipelines#use-an-observer-to-automate-pipeline-context-creation-extra-credit) has the ability to automatically scrape our compatibility tables and generate PRs or Pipeline Runs whenever a new version is discovered that is compatible with a provided kubernetes version set.  It's probably easiest to simply look at an example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Observer
metadata:
  name: ingress-nginx
spec:
  crontab: "*/5 * * * *"
  initial: 4.8.0
  target:
    order: SEMVER
    type: ADDON
    addon:
      name: ingress-nginx
      kubernetesVersions:
      - "1.28"
      - "1.29"
      - "1.30"
  actions:
  - type: PIPELINE
    configuration:
      pipeline:
        pipelineRef:
          name: ingress-nginx
          namespace: infra
        context:
          name: ingress-nginx
          version: $value
```

This will scrape the tables for (Ingress NGINX)[https://github.com/kubernetes/ingress-nginx] that are compatible with all of kubernetes versions 1.28, 1.29, and 1.30 and create a pipeline context to bounce the pipeline we've defined to deploy it across dev and prod.  This makes it very easy to trace an upgrade path across multiple versions with very little manual effort besides at most approving PRs.

Observers are a lot more flexible, and can also call PR automations that can trigger your own deployment automation on merge as well.


## Pipeline Setup

If you want to setup the pipeline acted on above, here's a basic example of how it could be done.

First, we want a wrapper service to house the manifests for our cluster SBOM.  Put it at `bootstrap/sbom.yaml` with contents:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: sbom
  namespace: infra
spec:
  git:
    folder: services/sbom
    ref: main
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  clusterRef:
    kind: Cluster
    name: mgmt
    namespace: infra
```

Then within `services/sbom` add the following:

`services/sbom/ingress-nginx/dev.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: ingress-nginx-dev
  namespace: infra
spec:
  mgmt: false
  tags:
    tier: dev
  template:
    git:
      folder: helm
      ref: main
    helm:
      chart: ingress-nginx
      url: https://kubernetes.github.io/ingress-nginx
      valuesFiles:
        - ingress-nginx.yaml.liquid
      version: 4.12.0
    name: ingress-nginx
    namespace: ingress-nginx
    repositoryRef:
      name: infra
      namespace: infra
```

`services/sbom/ingress-nginx/prod.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: GlobalService
metadata:
  name: ingress-nginx-prod
  namespace: infra
spec:
  mgmt: false
  tags:
    tier: prod
  template:
    git:
      folder: helm
      ref: main
    helm:
      chart: ingress-nginx
      url: https://kubernetes.github.io/ingress-nginx
      valuesFiles:
        - ingress-nginx.yaml.liquid
      version: 4.12.0
    name: ingress-nginx
    namespace: ingress-nginx
    repositoryRef:
      name: infra
      namespace: infra
```

`services/sbom/ingress-nginx/pipeline.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: Pipeline
metadata:
  name: ingress-nginx
spec:
  stages:
    - name: dev
      services:
        - serviceRef:
            name: sbom # <-- notice this points to the wrapper service above
            namespace: infra
          criteria:
            prAutomationRef:
              name: sbom-upgrade-pra
    - name: prod
      services:
        - serviceRef:
            name: sbom
            namespace: infra
          criteria:
            prAutomationRef:
              name: sbom-upgrade-pra
  edges:
  - from: dev
    to: prod
    gates:
    - name: approval-gate
      type: APPROVAL
```

`services/sbom/sbom-upgrade-pra.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: sbom-upgrade-pra
spec:
  documentation: Updates a specific sbom addon to a new chart version
  updates:
    yamlOverlays:
    - file: services/sbom/{{ context.name }}/{{ context.pipeline.stage.name }}.yaml
      yaml: |
        spec:
          template:
            helm:
              version: "{{ context.version }}"
  scmConnectionRef:
    name: plural
  title: "Update addon {{ context.name }} to chart version {{ context.version }}"
  message: "Update addon {{ context.name }} to chart version {{ context.version }}"
  identifier: mgmt # <-- can change it to the explicity name of your repo if you wish, or the mgmt identifier will use your management repo
  configuration:
  - name: name
    type: STRING
    documentation: the name of the addon
  - name: version
    type: STRING
    documentation: the version of the addon
```

This setup also provides a flexible way to add other SBOM components (external-dns, cert-manager, etc) with the same dev/prod pipeline structure.  

{% callout severity="info" %}
Notice how the PR automation is parameterized by name, which allows it to find the appropriate file to update for each pipeline stage. If you maintain that file structure, you'll be able to reuse the same pattern for any set of global services/pipelines.
{% /callout %}

This workflow will:

* For the dev stage, modify the `services/sbom/ingress-nginx/dev.yaml` file with the new version supplied to the pipeline by the observer and create a pull request to have the change reviewed and merged.
* wait for manual approval in the Plural Console UI
* Progress to the prod stage, issuing a similar PR for `services/sbom/ingress-nginx/prod.yaml`.