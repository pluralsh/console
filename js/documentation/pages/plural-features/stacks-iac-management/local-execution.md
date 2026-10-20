---
title: Local execution
description: Executing IaC from Plural Stacks locally
---

One of the crucial aspects of Infrastructure as Code is that you always have local execution as a break-glass measure if your control plane is broken.  We make sure that principle is preserved in all cases.  There are two cases to consider:

* You're using a self-managed state store, like S3.  In this case, as long as you can replicate cloud creds locally, you can use your IaC outside of Plural at any time.
* You're using Plural to manage your state.

## Run locally with Plural Managed State

Plural's Terraform state backend works by using the `http` remote backend and writing an `_override.tf` file to the local folder to wire in that backend.  You can invoke that logic from the CLI with:

```sh
plural cd stacks gen-backend
```

This will write the same file locally, and a `terraform init` will initialize Terraform against that HTTP backend.  

{% callout severity="warning" %}
This file will potentially contain secret information, so you should be careful not to commit it to Git.
{% /callout %}