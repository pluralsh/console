---
title: Service catalog
description: Enterprise Grade Self-Service with Plural
---

{% callout severity="info" %}
If you want to skip the text and see it in action, jump to the {% doclink to="service_catalog_overview" %}demo video{% /doclink %}
{% /callout %}

Plural provides a full-stack GitOps platform for provisioning resources with both IaC frameworks like Terraform and Kubernetes manifests like Helm and Kustomize.  This alone is very powerful, but most enterprises want to go a step further and implement full self-service.  This provides two main benefits:

* Reduction of manual toil and error in repeatable infrastructure provisioning paths
* Ensuring compliance with enterprise cybersecurity and reliability standards in the creation of new infrastructure, e.g. the creation of "Golden Paths".

Plural accomplishes this via our Catalog feature, which allows {% doclink to="plural_features_pr_automation" %}PR Automations{% /doclink %} to be bundled according to common infrastructure provisioning use cases.  We like the code generation approach for several reasons:

* Clear tie-in with established review-and-approval mechanisms in the PR process
* Great customizability throughout the lifecycle.
* Generality - in theory, any infrastructure provisioning task can be represented as some Terraform + GitOps code

# Demo Video

To see all of this in action provisioning a relatively complex application, [Dagster](https://dagster.io/), watch our live demo video of our GenAI integration on YouTube:

{% embed url="https://youtu.be/vinOy376SKE" aspectRatio="16 / 9" /%}
