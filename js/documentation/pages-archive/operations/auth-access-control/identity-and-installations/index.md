---
title: Advanced Topics
---

### Installation

Any Plural identity can install applications, which will then be tied back to the installing user to track their history and validate whether upgrades are still eligible. This has a few implications:

- Users should fix the cloud provider that identity is installing to, as a workspace for that users installation likely can't span multiple providers
- For production-grade workloads where you'd like to have a full team managing an installation, it's typically better to use a Service Account to manage an installation.

Any activity the Plural Console does against the Plural API is also authenticated as the installer's identity. So support tickets will usually be created using that user, and the upgrade websocket is created on behalf of that user. This makes a lot of things a lot simpler in a disconnected architecture like Plural's.

### Publishing

Members on a Plural account can become publishers if given the appropriate role, or if they are the account owner. Publishers have the ability to create application repositories, publish terraform or helm packages to repositories, and determine payment plans for applications.
