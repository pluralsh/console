---
title: Plural AI with Flows
description: Your developer's AI SRE
---

## Overview

Developers interacting with Kubernetes or any form of infrastructure are frequently not equipped to troubleshoot their own issues.  This is due to knowledge gaps (they don't understand the cloud, and certainly not Kubernetes) and permission gaps (security controls prevent them from seeing what is necessary to fix their own problems).  This ultimately leads to:

* excessive support requests on DevOps/SRE teams
* burnout among operational personnel
* unnecessarily slow MTTR for serious customer-facing issues when they do arise

A key value of flows is organizing disparate infrastructure data into a single unit.  This is incredibly powerful for applying AI to infrastructure issues because it simultaneously:

* establishes the relationships needed to guide fetching external data into context with high fidelity
* establishes a clear governance structure so you don't fetch what a developer shouldn't be able to see and have the AI regurgitate it to them

These dual mandates ensure Plural AI is both informative and enterprise-grade, even in highly regulated contexts.  Without the ability to fetch the necessary info, any AI assistant will quickly spin in circles and not be worth an engineer's effort.

In particular, Flows come pre-baked with:

* Fetching of the Kubernetes configuration of all objects registered with the flow
* Log aggregation extraction of *only* the logs emitted from Kubernetes pods within the flow
* Vector indexing of incoming PRs associated with the flow to enable semantic search for finding line-of-code root causes
* A knowledge graph the AI can use to remember past incidents and how they were previously resolved in the event of a repeat issue.

All of these give the AI knowledge of live Kubernetes state, runtime information about the containers running in the Flow, and historical code changes that might have impacted the services within it.

Finally, Plural Flows can also interact with MCP servers, which can be used to implement various operational tasks and replace a lot of internal admin portals for basic data correction tasks.