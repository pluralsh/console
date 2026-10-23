---
title: Pull request automation
description: Self-Service GitOps with PR automation
---
GitOps and Infrastructure as Code workflows are extremely powerful, but they require a fair amount of manual care and feeding to operate long-term. Each reconfiguration requires a code change, which usually involves manual human effort that is expensive and error-prone. Plural solves this by providing a toolkit to automate on top of your IaC workflows using several key patterns:

- A custom Renovate build that provides turnkey PR generation for dependency releases, like Helm charts
- PR Automation Custom Resources to provide your own self-service workflows for either modifying existing resources in your codebase, or generating new services
- Pipelines driven by PR Automations, allowing your release process to be fully automated while still providing all the auditability benefits of GitOps
