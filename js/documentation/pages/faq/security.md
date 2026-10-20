---
title: Is Plural secure?
description: Learn about what Plural has access to at various steps of deployment.
---

# Certifications


Plural is currently a part of the **Cloud Native Computing Foundation** and **Cloud Native Landscape**. In addition, we maintain the following certifications:

* **GDPR**
* **SOC 2 Type 2**


In more detail, we maintain a few key guarantees around our use of cloud data and access to your infrastructure for our two main distribution channels.

# Plural Console

The Plural Console by default has access to nothing in your cloud.  To grant it access you'll have to do one of the following:

* manually configure an SCM connection to connect to your source control provider (e.g. GitHub)
* manually bind a workload identity role to the service account used by a Plural Console-related pod (e.g. for stack runners)

In addition, the Console will only make two outbound network requests, outside of those used to run Terraform or pull from Git:

* A request to validate your instance's license.  This can be replaced with a cryptographic license key, and thus disabled.
* A request to compile our deprecation tables using our upstream dataset.  This can also be replaced by an airgapped version with the tables baked into our binary.  The tradeoff will be staleness.

# Plural Cloud

A Plural Console running in Plural Cloud is functionally equivalent to any other instance of Plural, but since it sits on our servers, it's worth being aware that we can collect credentials in a few ways:

1. Plural-managed Terraform state could have various credentials inside it.
2. SCM credentials are stored row-encrypted in our database (but can be revoked at any time).
3. Service secrets are stored row-encrypted in our database (but you can use cloud-native secret managers if you prefer robustness over convenience).

Since you'll still need to create a small management cluster to attach to your cloud console, that cluster is what any cloud credentials for executing Terraform, etc. are bound to, so you do not need to exchange any cloud credentials with Plural to use Plural Cloud.
 