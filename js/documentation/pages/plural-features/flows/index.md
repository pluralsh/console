---
title: Flows
description: 'Developer-Facing Portal for your Kubernetes Infrastructure'
---

## Overview

{% callout severity="info" %}
If you want to skip the text and see it in action, jump to the demo video below.
{% /callout %}

Kubernetes is often too overwhelming for developers to comprehend the state of the applications they're managing, even though these are often simple stateless services, static frontends, or small sets of microservices.  Platform engineers often solve this by providing a basic "abstraction layer" on top of their Kubernetes clusters, usually built from a slapdash mix of tools like internal UIs, Backstage, ArgoCD, and others.

Plural Flows provide a first-class way to do this, natively integrated with the rest of the Plural experience.  A Flow encompasses:

* a set of registered Plural Services
* a set of registered Plural Pipelines
* any alerts or pull requests we've discovered attached to those components

It provides several key benefits:

* Better intelligibility for end developers
* Simplified permissions - which propagate to all components of a flow and can be mapped to your AD groups registered with Plural

Because it gives us a clear boundary for what's related to what, and what a user is permitted to look into, we can use it as a decision point within Plural AI to provide a powerful copilot experience that helps end developers understand their infrastructure.  This includes:

* Pre-made tool calls to query data about their services/clusters/etc
* The ability to call out to Model Context Protocol (MCP) servers for external operations tasks
* A built-in knowledge graph layer to continuously enrich the context available to the AI

Plural Flows can also vector index PRs, query app log data, and respond to incoming alerts, extending our AI insight engine into a general troubleshooting tool for application code errors alongside its built-in support for Kubernetes misconfiguration.

# Demo Video

To see all of this in action, watch our live demo video of Plural Flows on YouTube:

{% embed url="https://youtu.be/1OX8OXEilyg" aspectRatio="16 / 9" /%}
