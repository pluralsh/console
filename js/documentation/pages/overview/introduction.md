---
title: Introduction
description: >-
  Plural is your single pane of glass for Enterprise-Grade Kubernetes Fleet Management
---

# What is Plural?

Plural is a unified cloud orchestrator for the management of Kubernetes at scale.  In particular, the fleet management problem as we understand it is decomposed into providing a consistent workflow for 4 main concerns:

1. Kubernetes Continuous Deployment - you need a GitOps-based, drift-detecting mechanism to sync Kubernetes YAML manifests, written in Helm, Kustomize, raw YAML, etc., into target Kubernetes clusters.  It should also be orchestrable via API to support a scalable workflow for any fleet size.
2. Kubernetes Dashboarding - a secure, SSO-integrated Kubernetes dashboard layer for ad-hoc troubleshooting.  GitOps should handle anything on a write-path, but you still need a strong read-path that's not burdened with friction.
3. Infrastructure-As-Code Management - implemented via {% doclink to="plural_features_stacks_iac_management" %}Stacks{% /doclink %}, this provides a Kubernetes-native, API-driven mechanism to scalably manage the Terraform complexity that immediately arises when using Kubernetes in earnest.
4. Self-Service Code Generation - the glue that ties everything together: a repeatable PR Automation API that lets you generate the manifests for any workflow in 1-3 via self-service with a simple UI wizard.  Think of it like Backstage for Kubernetes.

In addition, we support a robust, enterprise-ready {% doclink to="overview_architecture" %}Architecture{% /doclink %}. This separates the management cluster from an agent within each workload cluster to achieve scalability and enhanced security, compensating for the risks of introducing a single pane of glass to Kubernetes.  The agent can only communicate with the management cluster via egress networking, and executes all write operations with local credentials, removing the need for the management cluster to be a repository of global credentials.  If you want to learn more about the nuts and bolts, visit our {% doclink to="overview_architecture" %}Architecture Page{% /doclink %}.

## Plural AI

Plural integrates heavily with LLMs to enable complex automation within the realm of GitOps that ordinary deterministic methods struggle to get right.  This includes:

* running root cause analysis on failing Kubernetes services, using a hand-tailored evidence graph Plural extracts from its own fleet control plane
* using AI troubleshooting insights to autogenerate fix PRs by introspecting Plural's own GitOps and IaC engines
* using AI code generation to generate PRs for scaling recommendations from our Kubecost integration
* "Explain with AI" and chat features to explain any complex Kubernetes object in the system, reducing the platform engineering support burden from app developers still new to Kubernetes.

The goal of Plural's AI implementation is not to shoehorn LLMs into every infrastructure workflow, which is not just misguided but dangerous.  Instead, we're trying to automate the mindless gruntwork that comes with infrastructure, like troubleshooting well-known bugs, fixing YAML typos, and explaining the details of established technology like Kubernetes.  This is the sort of work that wastes precious engineering time and bogs down enterprises trying to build serious developer platforms.

You can read more about it under {% doclink to="plural_features_plural_ai" %}Plural AI{% /doclink %}.

## Plural Service Catalog

We also maintain a catalog of open source applications like Airbyte, Airflow, etc. that can be deployed to Kubernetes on most major clouds.  The entire infrastructure is extensible and recreatable as users and software vendors as well.  

You can also define your own internal catalogs and vendors can share catalogs of their own software. It is meant to be a standard interface to support developer self-service for virtually any infrastructure provisioning workflow.

The full docs are available under {% doclink to="plural_features_service_catalog_overview" %}Service Catalog{% /doclink %}.