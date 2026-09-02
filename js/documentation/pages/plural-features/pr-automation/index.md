---
title: Pull request automation
description: Self-Service GitOps with PR automation
---
GitOps and Infrastructure as Code workflows are extremely powerful, but they include a fair amount of manual care and feeding to operate longterm. Each reconfiguration requires a code change which usually involves manual human effort that is expensive and prone to error. Plural intends to solve that by providing a toolkit to automate on top of your IaC workflows using a number of key patterns:

- custom Renovate build meant to provide turnkey setup for PR generation for dependency releases, like helm charts
- PR Automation Custom Resources to provide your own self-service workflows for either modifying existing resources in your codebase, or generating new services
- Pipelines driven by PR Automations, allowing your release process to be fully automated while still providing all the auditability benefits of GitOps
