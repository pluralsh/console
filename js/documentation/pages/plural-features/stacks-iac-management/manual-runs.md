---
title: Manual runs
description: Repair errors or one-off tasks in the stack environment
---

Infrastructure as Code is great, but definitely will occasionally flake.  Anything from drift in infrastructure or a terraform lock going awry can cause annoying breakages.  Manual runs are meant to solve for this.  There are two main modes of a manual run:

* One-off script supplied by the user in-UI
* Pre-configured runs for common repair workflows, like running `terraform force-unlock {lock-id}` which can enhance self-serviceability of the process

## Launching a Manual Run

To launch a manual run, simply click the `Create manual run` button in the stacks UI

![](/assets/stacks/manual-run.png)

This will provide a simple wizard which can guide you through the workflow.  This will trigger a run with the expected commands, within the same environment as a standard stack run.

## Create a Custom Run

You can create a pre-baked manual run via the `CustomRun` CRD, like so:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: CustomStackRun
metadata:
  name: force-unlock
spec:
  name: force-unlock
  documentation: "force release a terraform lock if present"
  commands:
  - cmd: terraform
    args: [init]
  - cmd: terraform
    args:
    - force-unlock
    - '-force'
    - "{{ context.lockId }}"
  configuration:
  - name: lockId
    type: STRING
    documentation: the lock id to release
```

This creates a wizard-based manual run for the `terraform force-unlock` command, which can save your engineers a tedious look through the docs.  It's also incredibly useful if you have customized your runner with additional scripts that might be used for ad-hoc operations.