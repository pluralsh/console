---
title: Local execution
description: Executing IaC from Plural Stacks Locally
---

One of the crucial aspects of Infrastructure as Code is you always have local execution as a break-glass measure if your control plane is broken.  We make sure that principle is preserved in all cases.  There are really two cases here to consider:

* You're using a self-managed state store, like s3.  In this case, as long as you can replicate cloud creds locally, you can use your IaC outside of Plural at any time if you wish.
* You're using Plural to manage your state.

## Run locally with Plural Managed State

Plural's terraform state backend ultimately works by using the `http` remote backend and writing an `_override.tf` file to the local folder to wire in that backend.  You can invoke that logic from the cli with:

```sh
plural cd stacks gen-backend
```

This will write the same file locally, and a `terraform init` will initialize terraform against that http backend.  

{% callout severity="warning" %}
This file will potentially contain secret information, so you should be careful not to commit it to Git
{% /callout %}