---
title: Flows
description: 'Developer-Facing Portal for your Kubernetes Infrastructure'
---

## Overview

{% callout severity="info" %}
If you just want to skip the text and see it in action, skip to the demo video below.
{% /callout %}

Kubernetes is often too overwhelming for developers to comprehend the state of the applications they're managing, despite the fact that these are often simple stateless services, static frontends, or small sets of microservices.  Platform engineers often solve for this by providing a basic "abstraction layer" on top of their kubernetes clusters, often accomplished with a slapdash of tools like internal UIs, Backstage, ArgoCD and others.

Plural Flows provide a first-order way to do this, natively integrated with the rest of the Plural experience.  It encompasses:

* a set of registered Plural Services
* a set of registered Plural Pipelines
* any alerts or pull requests we've discovered attached to those components

It provides a number of key benefits:

* Better intelligibility to end developers
* Simplification of permissions - which propagate to all components to a flow and can be mapped to your AD groups registered with Plural

Further, because it gives us a clear circumference to understand what's related to what, and what's permitted to look into, we can use it as a decision point within Plural AI to provide a powerful copilot experience for end developers to understand their infrastructure.  This includes:

* Pre-made tool calls to query data about their services/clusters/etc
* Ability to call out to Model Context Protocol (MCP) for external operations tasks
* A built in knowledge graph layer to continuously enrich the context available to the AI

Further, Plural Flows can vector index prs, query app log data and respond to incoming alerts, extending the capabilities of our AI insight engine to be able to be a general troubleshooting tool for application code errors alongside our already built-in support for Kubernetes misconfiguration.

# Demo Video

To see this all in action, feel free to browse our live demo video on Youtube for all that can be done with Plural Flows:

{% embed url="https://youtu.be/1OX8OXEilyg" aspectRatio="16 / 9" /%}
