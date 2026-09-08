---
title: How to use Plural
description: How To Guides for Getting the Most Out of Plural
---
These tutorials will guide you through a miniaturized example of the Kubernetes adoption process.  The basic steps are:

1. Setup your management cluster
2. Setup a few workload clusters to separate dev and prod workloads
3. Setup a base kubernetes runtime, in this case for managing networking w/ ingress, cert-manager, and external-dns
4. Deploy dev + prod microservices
5. Setup Pipelines between them.

We also go into a few other usecases that will often become useful, in particular:

* Implementing cloud self-service with our PR Automation and Terraform Stacks APIs.
* Integrating closely with your source control provider, to tightly integrate your deployment workflows with the code review and approval process.

They are meant to be consumed in order, but you can also browse around.
