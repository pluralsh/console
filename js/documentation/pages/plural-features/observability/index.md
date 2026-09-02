---
title: Observability Configuration
description: Configure metrics and logs provider directly into the Plural UI 
---

Plural has the ability to query multiple backends for standard observability data and integrate them directly into the mainline Plural experience.  In particular, these are:

* Prometheus for timeseries metrics
* Elastic (and others) for log aggregation
* Kubecost for kubernetes cost observability

All observability implementations are designed to be multi-cluster by default and we also provide out-of-the-box installs in the event a user still hasn't adopted a proper solution for any of the main observability providers.

There are a few major benefits of integrating this data with Plural:

* Single-Pane-Of-Glass for Operations - a unified infrastructure management and observability platform reduces context switching for engineers, and makes it easier for team-members to ramp with their operational responsibilities.
* AI - this is the most powerful benefit, as Plural gets access to more data, we can integrate it with our unified AI engine and automate more of the tedious root cause analysis and troubleshooting you'd otherwise do manually.


## Plural AI + Observability

Generally, Plural AI is a broad RAG system that ultimately calls into mainline LLMs.  This means the more data we can access, the more likely we can find that diamond in the rough that solves your specific problem.

In particular, there are a few major workflows our observability integration pairs with Plural AI:

* Log analysis of low-level Kubernetes components: a few tools, especially external-dns and cert-manager, provided very little error-reporting outside of their logs.  With an easier way to extract these, we can automatically root cause failures around DNS registration and certificate issuance, which are both commong annoyances with Kubernetes operators.  This is true of a number of other tools as well, especially solutions like CSI drivers.
* Application Code Failures - common failure modes like failing health checks, 500 error codes, etc, are usually due to bugs in application code and not at the infrastructure level.  With a combination of log analysis and searchable PR data, we can RCA these issues and cross reference them to the offending code changes.

## CRD Configurability

For the most part, these settings are entirely configurable via one of our Kubernetes custom resources, `DeploymentSettings`.  A kitchen-sink example of this is below:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: DeploymentSettings
metadata:
  name: global # this is a singleton resource that is always at this location
  namespace: plrl-deploy-operator
spec:
  managementRepo: pluralsh/plrl-boot-aws
  cost: # configuring recommendations from kubecost data
    recommendationCushion: 15
    recommendationThreshold: 1
    
  ai:
    enabled: true

    vectorStore: # elastic can be repurposed as a vector store too
      enabled: true
      vectorStore: ELASTIC
      elastic:
        host: https://{your-elastic-fqdn}
        user: plrl
        index: plrl-ai-vectors
        passwordSecretRef:
          name: plrl-elastic-user
          key: password
    
  logging:
    enabled: true
    driver: ELASTIC
    elastic:
      host: https://{your-elastic-fqdn}
      user: plrl
      index: plrl-logs-*
      passwordSecretRef:
        name: plrl-elastic-user
        key: password

  prometheusConnection:
    host: https://{your-prometheus-url}
    user: plrl
    passwordSecretRef:
      name: basic-auth-prom
      key: password
```

## Observability Webhooks

Plural supports integrations with third-party alerting and monitoring tools via webhooks, allowing you to establish connections to popular observability platforms. These are configured through the Plural UI.

### Supported Integrations

* **Datadog** - Forward metrics, logs, and alerts from Datadog to the Plural Console.
* **Grafana** - Forward alerts from Grafana to the Plural Console for centralized monitoring and incident management.
