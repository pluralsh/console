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

The deployment operator delivers the devbox daemon and the agents with each release, independently of the environment image. When a runner changes, or a new operator release ships a new daemon or agent version, existing instances move to the new revision in place: by default when they next resume, and always when an update is triggered from Plural (see `spec.instanceUpdatePolicy`). An update keeps the instance's home and agent threads, but restarts its processes and resets the rest of its filesystem to the image, so anything installed outside the home, for example with `apt-get`, is gone afterwards.

See [Environment images](/plural-features/devboxes/environment-images) for building your own image, and the [Agent API reference](/api-reference/kubernetes/agent-api-reference#devboxrunner) for every `DevboxRunner` field.
