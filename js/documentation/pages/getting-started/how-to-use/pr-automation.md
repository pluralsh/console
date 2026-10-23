---
title: Use PR automations for self-service
description: Use a PR Automation for an example Self-Service S3 bucket creation workflow
---

# Overview

Cloud infrastructure changes rapidly, and often the manual nature of infrastructure-as-code workflows can become a drag on velocity, causing organizations to reach for more self-service approaches.  This can involve stitching together Backstage, GitLab, ArgoCD, or any other set of tools.  Plural provides a single cloud orchestrator to provide all those key functionalities in one control plane.

We'll show how this can work beyond a Kubernetes provisioning use case, to provisioning an S3 bucket, a common resource also needed by Kubernetes workloads.  It'll operate by:

* Creating a PR Automation (PRA) to make the provisioning of buckets repeatable
* Using that PRA to create an `InfrastructureStack` to provision the S3 bucket using a Plural Terraform stack.

{% callout severity="warning" %}
This guide will not work properly unless you've finished the tutorial [Integrate with your Source Control Provider](/getting-started/how-to-use/scm-connection).
{% /callout %}

## Define the PR Automation

This PR Automation is going to leverage resources that have already been created in the `plural up` repo for you, in particular:

* `terraform/modules/blob/s3` - a basic S3 bucket module we've predefined that can be used for provisioning the bucket
* `templates/blobstore/*` - a couple of templates that will be used to set up the blobstore provisioning process via a PRA

Given those manifests, the PR Automation YAML could be something like this, which you'd place in `bootstrap/pr-automation/blobstore.yaml`:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: blob-creator
spec:
  name: blob-creator
  documentation: |
    Sets up a PR to provision a blobstore with a given type (eg s3) and region
  creates:
    templates:
    - source: templates/blob/stack.yaml
      destination: "services/blobstores/{{ context.type }}/{{ context.name }}.yaml"
      external: false
    - source: templates/blob/service.yaml
      destination: "bootstrap/blobstores.yaml"
      external: false
  scmConnectionRef:
    name: github
  title: "Adding a {{ context.type }} bucket {{ context.name }}"
  message: "Setup a stack to manage the {{ context.name }} {{ context.type }} bucket"
  identifier: your-org/your-plural-up-repo # <---- replace with the slug for your plural up repo
  configuration:
  - name: name
    type: STRING
    documentation: the name of this blob store (if using s3, this would become an s3 bucket name)
    validation:
      regex: "[a-z][a-z-0-9]+"
  - name: type
    type: ENUM
    documentation: the type of blob storage to provision
    values:
    - s3
  - name: region
    type: STRING
    documentation: the region your blobstore will live in
```

Breaking down what this resource does, since it's somewhat complicated:

* It'll create a self-service wizard in the Plural UI to provision new blobstores. The inputs to that wizard are defined in `spec.configuration`.  The API will also typecheck each input provided to ensure everything is sane (notice the name field also has an additional regex validation to ensure properly formatted names are provided).
* It'll write two files:
    1. `bootstrap/blobstores.yaml` - this creates a service to own each of the blobstores.  This is to prevent the main `apps` service synced under the `bootstrap` folder from becoming too bloated.
    2. `services/blobstores/{type}/{name}.yaml` - This records the actual `InfrastructureStack` CRD, which configures the Stack which will own deployment of this instance of the `terraform/modules/blob/s3` stack.
* Finally, it'll create a PR with those changes against the source repo configured at `spec.identifier`.  The `scmConnectionRef` provided will need permissions to create PRs and push to this repo for that to work.

## Push to Deploy

We registered all these manifests under the root `bootstrap` folder, which a `plural up`-derived management cluster listens to by default, so all you should need to do is either:

```sh
git commit -m "setup blobstore pr automation"
git push
```

or create a PR, approve it, and merge to have this new PR Automation deploy.  

{% callout severity="info" %}
You might need to wait a minute or two for the system to poll git and realize there's a new change.
{% /callout %}

Once you've configured all of these, you should see the new PR Automation at https://{your-console-domain}/pr/automations.

## Execute the PR Automation And Merge

Once the PR Automation is created, the process is very straightforward:

1. Go to https://{your-console-domain}/pr/automations
2. Click `Create PR` on the row with your new automation, and enter the wizard.  This will create a new PR
3. Wait for the `apps` service to sync, or manually sync it with the UI.
4. Go to https://console.mgmt.plural.sh/stacks and find a stack named blobstore-{name}.  This should have a run either in-progress or `Pending Approval`.
5. Validate the `terraform plan` in that run, either using the dedicated `Plan` tab or the command output.  Click `Approve`.

Once `terraform apply` completes, you should have a new S3 bucket!

## Generalizing the workflow

This is somewhat overkill if you're only creating an S3 bucket, but the pattern can be easily generalized to other cloud provisioning use cases.  The general flow is:

1. Write a single Terraform module to accomplish the goal, e.g. creating an RDS database, an S3 bucket, or an Azure Virtual Network.
2. Write a few Liquid templates to define how these will be instantiated as `InfrastructureStack` resources, and maybe how to chain syncs via services descended from the main `bootstrap` folder.  (That's the purpose of the `bootstrap/blobstores.yaml` file).
3. Write a PRA to automate generation of the files from (2).
4. Profit!
