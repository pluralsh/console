---
title: CI Integration
description: Deploying your services using the Plural Console UI.
---

## Overview

Plural is meant to help you separate the concerns around software delivery and deployment from your CI provider, which is usually purpose built for running unit tests and compiling build artifacts. There are some major motivations for this separation, among them being:

- Deployment is frequently a much longer running process than a standard code change, encompassing staged releases across multiple environments with multiple rounds of integration testing.
- A seperated CD system can make it easy to manage drift in micro-service dependencies by allowing them to be tested in tandem and rolled back independently.
- Separating CD enhances your security posture by not requiring master creds in a build service like Jenkins or a cloud service like Circle-CI.
- A Central CD service drastically simplifies managing polymorphic infrastructure providers, as a pull based architecture naturally can extend to multi-cloud or on-prem delivery models.

We rely on two models for doing delivery, full GitOps, where the definition of a service is fully specified in Git, and parameterized GitOps, in which case you can define templated manifests and use our service configuration to inject variables like docker image tags, hostnames, etc to parameterize your service.

The parameterized model enables a few useful operational models, namely:

- Updating docker image tags for a service after a successful merge to `main`, then releasing it down a deployment pipeline.
- Deep-cloning a service to create a pull-request based environment, while only changing a hostname.
- Full rollbacks/roll-forwards of configuration in the inevitable event of an engineer misconfiguring a service
- Importing state from terraform/pulumi into one of your CD services.
