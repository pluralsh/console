---
title: Service catalog
description: Enterprise Grade Self-Service with Plural
---

{% callout severity="info" %}
If you just want to skip the text and see it in action, skip to the {% doclink to="service_catalog_overview" %}demo video{% /doclink %}
{% /callout %}

Plural provides a full-stack GitOps platform for provisioning resources with both IaC frameworks like terraform and Kubernetes manifests like helm and kustomize.  This alone is very powerful, but most enterprises want to go a step beyond and implement full self-service.  This provides two main benefits:

* Reduction of manual toil and error in repeatable infrastructure provisioning paths
* Ensuring compliance with enterprise cybersecurity and reliabilty standards in the creation of new infrastructure, eg the creation of "Golden Paths".

Plural accomplishes this via our Catalog feature, which allows {% doclink to="plural_features_pr_automation" %}PR Automations{% /doclink %} to be bundled according to common infrastructure provisioning usecases.  We like the code generation approach for a number of reasons:

* Clear tie-in with established review-and-approval mechanisms in the PR-process
* Great customizability throughout the lifecycle.
* Generality - any infrastructure provisioning task can be represented as some terraform + GitOps code in theory

# Demo Video

To see this all in action in provisioning a relatively complex application in [Dagster](https://dagster.io/), feel free to browse our live demo video on Youtube of our GenAI integration:

{% embed url="https://youtu.be/vinOy376SKE" aspectRatio="16 / 9" /%}
