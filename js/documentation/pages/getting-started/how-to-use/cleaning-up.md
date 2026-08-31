---
title: Cleaning Up
description: How to deprovision everything you created with Plural
---

# Cleaning Up Your Environment

If you were simply testing and want to clean up your environment there are basically two steps:

* Remove any infrastructure managed by Plural.  This should involve:
  * Delete the Plural Stacks you set up.  **Be sure to do this via a GitOps process, not the UI, as our operator will recreate the stack if you do not**.
  * Delete the services that might also spawn resources, especially those that create load balancers.
* This is often doable by simply reverting the PRs we generate to provision that infra.
* from there run `plural down` or `plural down --cloud` if you were using Plural Cloud.

{% callout severity="warn" %}
There are two main gotchas to be aware of:

* You must run `plural down --cloud` if you're connected via Plural cloud, otherwise there's a `plural_cluster` resource that needs to be manually removed from tf state.
* If you do not properly clean up the resources Plural created before deleting your management cluster with `plural down --cloud`, **you will have dangling resources that need to be manually deleted.**  Plural actually does a great job of being able to destroy resources, but it is up to the user to know what they created and what they need to delete.
{% /callout %}

## The plural down command

The `plural down` command is actually a simple wrapper around what is effectively:

```sh
cd terraform/mgmt && terraform init && terraform destroy
```

If for whatever reason it isn't working for you, you can always try to fall back to terraform manually.

{% callout severity="warn" %}
Fundamentally, it simply destroys the infrastructure of your management cluster.  That's why it must be run at the end of the process of destroying the infrastructure Plural creates, otherwise you get in a reverse chicken-egg situation.  


Usually to destroy all those resources, you should be able to go to your plural infra repo, and find them being declared in the `/bootstrap` folder.
{% /callout %}
