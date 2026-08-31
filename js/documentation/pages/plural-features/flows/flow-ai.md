---
title: Plural AI with Flows
description: Your developer's AI SRE
---

## Overview

Developers interacting with Kubernetes or any form of infrastructure frequently are not equipped to troubleshoot their own issues.  This is due to knowledge gaps, they simply don't undestand the cloud (and certainly not Kubernetes), and permission gaps, due to security controls, they aren't allowed to see what is necessary to fix their own problems.  This ultimately leads to:

* excessive support requests on DevOps/SRE teams
* burnout on operational personal
* unnecessarily slow MTTR for serious customer facing issues when they do arrive

A key value of flows is organizing disparate infrastructure data into a single unit.  This is incredibly powerful for enabling AI against infrastructure issues because it simultaneously:

* establishes the necessary relationships to guide fetching external data into context with high fidelity
* establishes a clear governance structure so you don't fetch what a developer shouldn't be able to see and have the AI regurgitate it to them

These dual mandates ensures Plural AI will be both informative and enterprise grade even in highly regulated contexts.  Without the ability to fetch the necessary info, any ai assistant will spin in circles quickly and not be worth the effort for an engineer.

In particular, Flows come pre-baked with the ability to:

* Fetch kubernetes configuration of all objects registered with the flow
* Extract Log aggregation extraction of *only* the logs emitted from kubernetes pods within the flow
* Vector index incoming PRs associated with the flow to enable semantic search for finding line-of-code root causes
* A knowledge graph the AI can use to remember past incidents and how they were previously resolved in the event of a repeat issue.

All of these gives the AI knowledge of live kubernetes state, runtime information about the containers running in the Flow and historical code changes that might have impacted the functioning of the services within.

Finally, Plural Flows can also interact with MCP servers, which can be used to implement various operational tasks and replace a lot of internal admin portals for basic data correction tasks.