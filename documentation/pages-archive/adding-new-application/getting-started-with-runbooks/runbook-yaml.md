---
title: YAML Runbooks
description: Creating a Plural runbook from YAML.
---

```yaml
apiVersion: platform.plural.sh/v1alpha1
kind: Runbook
metadata:
  name: scaling-manual
  labels:
    platform.plural.sh/pinned: 'true'
{{ include "ghost.labels" . | indent 4 }}
spec:
  name: Ghost Scaling
  description: overview of how to accurately scale ghost deployment
  display: |-
{{ .Files.Get "runbooks/scaling.xml" | indent 4 }}
  datasources:
  - name: cpu
    type: prometheus
    prometheus:
      format: cpu
      legend: $pod
      query: sum(rate(container_cpu_usage_seconds_total{namespace="{{ .Release.Namespace }}",pod=~"ghost-[0-9]+"}[5m])) by (pod)
  - name: memory
    type: prometheus
    prometheus:
      format: memory
      legend: $pod
      query: sum(container_memory_working_set_bytes{namespace="{{ .Release.Namespace }}",pod=~"ghost-[0-9]+",image!="",container!=""}) by (pod)
  - name: statefulset
    type: kubernetes
    kubernetes:
      resource: statefulset
      name: ghost
  - name: nodes
    type: nodes
  actions:
  - name: scale
    action: config
    redirectTo: '/'
    configuration:
      updates:
      - path:
        - ghost
        - resources
        - requests
        - cpu
        valueFrom: cpu
      - path:
        - ghost
        - resources
        - requests
        - memory
        valueFrom: memory
```

Each datasource has a type. At the moment, the only types Plural supports are prometheus, kubernetes, and nodes. Each type has a spec that's specific to the type.&#x20;

**prometheus** spec:

```yaml
prometheus:
  format:
  legend:
  query:
```

**kubernetes** spec:

```yaml
kubernetes:
  resource: # the kind of Kubernetes resource, i.e. statefulset
  name: # the name of the Kubernetes resource, i.e. ghost
```

**nodes** spec:

```yaml
# No spec needed, this just fetches all the nodes in the Kubernetes cluster.
```

Additionally, in `runbooks.yaml`, you can define a specific action that the runbook can take based off of context from what the user input has given it.

For example, in the file above, we've defined an action that allows the runbook to update the [home values file](https://github.com/pluralsh/plural-artifacts/blob/760ad90c55d42a8f3081d6e5082c8a8e508ef1b4/ghost/helm/ghost/values.yaml) for that installation. It's done by yaml path, which means it will recursively update `ghost.resources.request.cpu`.

This will update the yaml file, save it back, issue a commit, and create a build in the console to actually apply the change.
