---
title: Prompt-based PR Automation
description: Use a lightweight coding agent to automate routine GitOps changes
---

Deterministic PR automations win on speed and reliability, but the machinery does require setup and configuration.  You can simplify this greatly with our basic AI integration, where Plural uses a fast, sandboxed coding agent to make the code changes for your desired PR.  The process is:

1. Provide a templated prompt that defines the change needed in the repo.
2. When the PR Automation is invoked, the agent takes over and makes the modification.

{% callout severity="info" %}
These are especially useful for unstructured code changes, for instance, preserving documentation in YAML files or modifying Terraform code without complex regex logic.
{% /callout %}

## Basic Example

A simple example:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: PrAutomation
metadata:
  name: cluster-updater
spec:
  name: cluster-updater
  documentation: |
    Sets up a PR to provision a new workspace for a team.  This is fairly rudimentary at the moment for demonstration purposes
  ai:
    enabled: true # use this to toggle ai on existing PR automations
    prompt: |
      Update the kubernetes version configuration for the {{ context.name }} cluster.  It will be found in a file under clusters/{{ context.tier }} and should be a simple one-line YAML change.
  scmConnectionRef:
    name: github
  title: 'Updating the {{ context.tier}} cluster {{ context.name }}'
  message: "Updating the {{ context.tier }} cluster {{ context.name }}"
  identifier: pluralsh/pr-automation-demo # id slug for the repo this automation will be applied to
  configuration:
    - name: name
      type: STRING
      documentation: The name of this workspace
    - name: tier
      type: ENUM
      values:
      - dev
      - prod
```

You can call the automation with a `{"name": string, "tier": string}` context block at any time, and the code change is delegated to the AI according to the guidance given.  The prompt is also templatable, so you can customize it based on user input.