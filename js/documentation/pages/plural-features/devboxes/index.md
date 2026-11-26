---
title: Devboxes
description: Sandboxed development environments where coding agents work alongside your team
---

## Overview

A devbox is a sandboxed development environment, with your repositories checked out, where coding agents and people work side by side. Each devbox instance runs in its own sandbox on Agent Substrate and suspends to a snapshot when idle, so instances are cheap to keep around and fast to resume.

Platform teams describe a kind of devbox with a `DevboxRunner` resource on a cluster running the deployment operator. A runner sets:

* the **environment image** instances run, and the coding agents they offer (Claude Code, Codex, OpenCode, Gemini CLI, pi)
* per-instance resources and idle limits
* which repositories, package registries, hosts and cloud identities instances may use
* who in Plural can start instances from it

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DevboxRunner
metadata:
  name: platform
spec:
  image: ghcr.io/pluralsh/devbox-fat:<operator version>
  agents:
    - type: claude
      default: true
    - type: codex
```

The deployment operator delivers the devbox daemon and the agents with each release, independently of the environment image. Existing instances move to new versions in place, keeping their home directory and agent threads: by default when they next resume, or when an update is triggered from Plural. See [How devbox updates work](/plural-features/devboxes/updates).

See [Environment images](/plural-features/devboxes/environment-images) for building your own image, and the [Agent API reference](/api-reference/kubernetes/agent-api-reference#devboxrunner) for every `DevboxRunner` field.
