---
title: Management controller
description: GitOps CRDs reconciled on your management cluster
---

The **management controller** runs on your management cluster and reconciles the Plural Management API — the CRDs that register clusters, services, git repositories, stacks, PR automations, and other control-plane resources with the Console.

It acts as a GitOps frontend to the Console API: you declare desired state in Kubernetes, and the controller creates, updates, and synchronizes the corresponding Console resources. This is the same pattern described in [Management Controllers Reconciliation Logic](/plural-features/continuous-deployment/management-controllers-reconciliation-logic).

## Global configuration

Console-wide settings that are not tied to a single service or cluster — agent fleet helm defaults, observability backends, AI providers, RBAC bindings, repository references, and more — are configured through the `DeploymentSettings` CRD. See [DeploymentSettings](deployment-settings) for the singleton name, namespace, and full spec reference.

## API reference

The full Management API schema is in the {% doclink to="overview_api_reference" %}Management API Reference{% /doclink %}. Go types live in the [console controller API](https://github.com/pluralsh/console/tree/master/go/controller/api/v1alpha1).

## Read-only vs write resources

The controller also handles resources created outside Kubernetes. For instance, clusters are often provisioned in Terraform first. The controller can detect an existing Console resource and enter read-only mode — populating `status` for composition with other CRDs without taking ownership of lifecycle or drift.

## Getting started

If you used `plural up`, your management repo already contains bootstrap manifests for the management controller and a `DeploymentSettings` resource at `bootstrap/settings.yaml`. See [The deployment operator](/plural-features/continuous-deployment/deployment-operator) for per-cluster agent configuration on workload clusters.
