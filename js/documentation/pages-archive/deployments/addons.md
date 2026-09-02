---
title: Kubernetes Add-Ons
description: Extend Kubernetes to support load balancing, dns, monitoring and security
---

Kubernetes natively is just a container orchestrator, but it's apis can be easily extended to support many other major concerns within the DevOps space. Some of the more common usecases we currently support are:

- Networking - you need load balancers, dns, and cert management to build a full production service exposed to the outside world. We can deploy all the operators and controllers needed to get this set up in a fully self-service way.
- Monitoring - inject agents from Datadog, New Relic, Prometheus and other providers to provide observability to your fleet
- Security - tools like Trivy and Kubescape can continuously monitor clusters for vulnerabilities and enhance your security posture.
- Cost Monitoring - deploy the kubecost agent to give you coherent cost dashboards for your entire fleet

All of these will be constantly updated and maintained by us, you just need to perform the initial configuration via our wizards.

You can see all the addons we support in the `Add Ons` tab of Plural Deployments, as seen here:

![](/assets/deployments/addons.png)
