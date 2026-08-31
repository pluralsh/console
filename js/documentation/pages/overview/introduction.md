---
title: Introduction
description: >-
  Plural is your single pane of glass for Enterprise-Grade Kubernetes Fleet Management
---

# What is Plural?

Plural is a unified cloud orchestrator for the management of Kubernetes at scale.  In particular, the fleet management problem as we understand it is decomposed into providing a consistent workflow for 4 main concerns:

1. Kubernetes Continuous Deployment - you need a GitOps-based, drift-detecting mechanism to sync kubernetes yaml manifests, written in helm, kustomize, raw yaml, etc, into target kubernetes clusters.  It should also be orchestrable via API to support a scalable workflow to any fleet size.
2. Kubernetes Dashboarding - A secure, SSO-integrated Kubernetes dashboard layer for ad-hoc troubleshooting.  GitOps should handle anything on a write-path, but you still need a strong read-path that's not burdened with friction.
3. Infrastructure-As-Code Management - implemented via {% doclink to="plural_features_stacks_iac_management" %}Stacks{% /doclink %}, this provides a k8s-native, API-driven mechanism to scalably manage the terraform complexity that immediately arises when using kubernetes in earnest.
4. Self-Service Code Generation - the glue that ties everything together, a repeatable PR Automation API that allows you to self-serviceably generate the manifests for any workflow in 1-3 with a simple UI wizard.  Think of it like Backstage for Kubernetes.

In addition, we support a robust, enterprise-ready {% doclink to="overview_architecture" %}Architecture{% /doclink %}. This uses a separation of management cluster and an agent w/in each workload cluster to achieve scalability and enhanced security to compensate for the risks caused by introducing a Single-Pane-of-Glass to Kubernetes.  The agent can only communicate to the management cluster via egress networking, and executes all write operations with local credentials, removing the need for the management cluster to be a repository of global credentials.  If you want to learn more about the nuts-and-bolts feel free to visit our {% doclink to="overview_architecture" %}Architecture Page{% /doclink %}.

## Plural AI

Plural integrates heavily with LLMs to enable complex automation within the realm of GitOps ordinary deterministic methods struggle to get right.  This includes:

* running root cause analysis on failing kubernetes services, using a hand-tailored evidence graph Plural extracts from its own fleet control plane
* using AI troubleshooting insights to autogenerate fix prs by introspecting Plural's own GitOps and IaC engines
* using AI code generation to generate PRs for scaling recommendations from our Kubecost integration
* "Explain with AI" and chat feature to explain any complex kubernetes object in the system to reduce Platform engineering support burden from app developers still new to kubernetes.

The goal of Plural's AI implementation is not to shoehorn LLMs into every infrastructure workflow, which is not just misguided but actually dangerous.  Instead, we're trying to automate all the mindless gruntwork that comes with infrastructure, like troubleshooting well-known bugs, fixing YAML typos, and explaining the details of well-known, established technology like Kubernetes.  This is the sort of thing that wastes precious engineering time, and bogs down enterprises trying to build serious developer platforms.

You can read more about it under {% doclink to="plural_features_plural_ai" %}Plural AI{% /doclink %}.

## Plural Service Catalog

We also maintain a catalog of open source applications like Airbyte, Airflow, etc. that can be deployed to kubernetes on most major clouds.  The entire infrastructure is extensible and recreatable as users and software vendors as well.  

You can also define your own internal catalogs and vendors can share catalogs of their own software. It is meant to be a standard interface to support developer self-service for virtually any infrastructure provisioning workflow.

The full docs are available under {% doclink to="plural_features_service_catalog_overview" %}Service Catalog{% /doclink %}.