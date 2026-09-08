---
title: Architecture
---

The Plural architecture has three main components:

- Plural API and Catalog site (available at [https://app.plural.sh](https://app.plural.sh))
- Plural CLI and Git SCM to maintain the state of a user's applications
- Plural console for management of all plural applications on your infrastructure

At a high level, the interactions between all three components look something like this:

![](/assets/reference/architecture.png)

## Plural API

The primary responsibility of the Plural API is to store the packages needed for application installation - terraform, helm - and ingesting high-level dependency information about them. This allows us to properly sequence installations. It also serves as a publish-subscribe layer to communicate updates to clusters that have installed those applications, and can leverage the dependency information ingested to delay updates until a cluster has caught up with all the necessary dependencies.

It also can serve as an identity provider for any Plural application, delegating authentication via OIDC and also maintaining user group info and communicating it down to applications.

Finally it handles billing and licensing, supporting all the common constructs seen in modern SaaS billing

## Plural CLI

The Plural CLI effectively uses the Plural API as a package manager, and works as a higher level build tool on top of the DevOps packages it supports. It will handle things like running installations in dependency order, detecting changes between runs, and templating out a workspace from scratch.

It also is responsible for managing secret encryption of all application state in plural installation repos and provides a few useful tools for troubleshooting an application our admin console might not be well-suited to solve.

Finally it also provides the toolchain for publishing applications to the plural API.

## Plural Console

The Plural Console is the operational hub for all applications managed by Plural. It is deployed in-cluster alongside applications and provides a few key features:

- Automated upgrades - by subscribing to the API's upgrade websocket
- Observability - leveraging the dashboard and logging Kubernetes CRDs deployed alongside Plural applications
- Support - in-person support can be handled in our chat interface available directly in the admin console, with a lot of nice features like direct zoom integration

It's deployed as a highly available, scalable web service, with postgres as its datastore. It also directly integrates with Plural's OIDC for login and user management.
