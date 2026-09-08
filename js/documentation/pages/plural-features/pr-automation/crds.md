---
title: PR automation custom resources
description: Define your own Pull Request Automations with Kubernetes CRDs
---

You can use our CRD toolkit to generate new PR Automation flows easily. This can be as simple as generating pull requests for upgrading to a new kubernetes version in terraform, or it can involve more complex workflows. In this guide, we'll show how you can use it to provide self-service developer workspaces, a pretty common usecase for a lot of enterprises.

## Defining Templates

Most of the PR automation works off of Shopify's [Liquid](https://shopify.github.io/liquid/) templating engine. It's a well-documented, widely used templating library that frankly is a bit nicer than go's builtin text/template library. Plural provides a set of custom filters that can be used in your templates. For more information, see [Liquid Filters in PR Automation](filters.md).

For this example there are a few templates that are worth mentioning:

in `templates/service.yaml.liquid`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ServiceDeployment
metadata:
  name: {{ context.name }}
  namespace: infra
spec:
  namespace: {{ context.name }}
  git:
    folder: workspaces
    ref: main
  repositoryRef:
    kind: GitRepository
    name: infra
    namespace: infra
  configurationRef:
    name: plural-pull-creds
    namespace: infra
  helm:
    version: "0.x.x"
    chart: workloads
    valuesFiles:
    - {{ context.name }}.yaml
    repository:
      namespace: infra
      name: workloads
  clusterRef:
    kind: Cluster
    name: mgmt
    namespace: infra
```

and `workspace.yaml.liquid`:

```yaml
cluster: { { context.cluster } }
gitRepository: { { context.repo } }

access:
  write:
    - groupName: { { context.group } }

workloads: { { context.workloads } }
```

The first just generates a `ServiceDeployment` CRD (if you aren't familiar with this, feel free to look at the docs for the Plural operator) that will ultimately create the workspace service. The second is meant to define the helm values file for that service. The variables in `context` will be user specifed, and you can see it also takes a list of `workloads` that will be the individual components spawned by that service -- the workspace is in fact an app-of-apps.

## PR Automation Spec

Those templates are then used by a PR Automation resource like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ScmConnection
metadata:
  name: github
spec:
  name: github
  type: GITHUB
---
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: workspace-creator
spec:
  name: workspace-creator
  documentation: |
    Sets up a PR to provision a new workspace for a team.  This is fairly rudimentary at the moment for demonstration purposes
  creates:
    templates:
      - source: templates/service.yaml.liquid # points to the template above
        destination: 'apps/workspaces/{{ context.name }}.yaml'
        external: false # tells us to source the template from within the repo
      - source: templates/workspace.yaml.liquid # similar as above, pointing to above templates
        destination: workspaces/{{ context.name }}.yaml
        external: false
  scmConnectionRef:
    name: github
  title: 'Adding workspace {{ context.name }} for {{ context.group }}'
  message: "Adding workspace {{ context.name }} for {{ context.group }}\nWorkloads to be provisioned: [{{ context.workloads }}]"
  identifier: pluralsh/pr-automation-demo # id slug for the repo this automation will be applied to
  configuration:
    - name: name
      type: STRING
      documentation: The name of this workspace
    - name: cluster
      type: STRING
      documentation: The cluster this workspace deploys to
    - name: repo
      type: STRING
      documentation: The repo it is sourced from
    - name: group
      type: STRING
      documentation: A group w/ writer permissions for this workspace
    - name: workloads
      type: STRING
      documentation: comma separated list of workloads
```

Tying this together, we've created a PR Automation that is referencing the above two yaml templates, and is configured to create new files for the results of applying each. When the automation spec is created, it will be viewable within your Plural console under the PR tab, and you'll be able to create the PR and fill out a form like:

![](/assets/deployments/workspace-pr.png)

When the automation is triggered, it will take the results of that form, pass them to the templates, print them to the configured files, and call the appropriate SCM api (Github's in this case) to generate the pull request.

In this case, if the pull request is merged, there is already another service in place to sync the `apps/workspaces` folder, so it would deploy as the system polls in the new CRD in that folder and the new workspace would be provisioned.
