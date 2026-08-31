---
title: Cluster Drain Management
description: Safely migrate workloads in blue/green cluster upgrades
---

## Overview

A common painpoint in managing Kubernetes upgrades is handling the movement of applications themselves onto newly upgraded nodes.  Whenever a Kubernetes upgrade happens, especially in the cloud, the knock-on effect is every node and every pod is rebooted.  The default cadence of this is node-by-node, a `kubectl drain` command is effectively run for each node restarting any pod in the process.  Since this isn't knowledgeable of the deployments controlling those pods, it is easy to cause unavailability during the upgrade process, especially if applications are not coded to tolerate restarts gracefully.  The `ClusterDrain` custom resource is meant to solve this.

## Definition

Fundamentally the CRD is quite, simple, it can look something like this:

```yaml
apiVersion: deployments.plural.sh/v1alpha1
kind: ClusterDrain
metadata:
  
  name: drain-{{ cluster.metadata.master_version }}
  
spec:
  flowControl:
    maxConcurrency: 10
  labelSelector:
    matchLabels:
      deployments.plural.sh/drainable: "true"
```

What this is doing is whenever a cluster version is changed, it will create a new `ClusterDrain` then apply two constraints:

1. `labelSelector` - this will only apply to deployments, statefulsets, and daemonsets matching that label selector.
2. `flowControl` - a maximum concurrency level the drain process will utilize.  This can prevent too many pod restarts occurring concurrently.

As long as a deployment, statefulset, daemonset matches that selector, it will basically perform a graceful restart on the deployment - accomplished by adding a temporary annotation to its podTemplate subfield.  This will inherit the existing rollout policies of that controller, which developers will have tuned their applications to tolerate (otherwise they could never release their code to k8s).

An example resource opted-in to the drain would be:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    deployments.plural.sh/drain-wave: "0"
  labels:
    deployments.plural.sh/drainable: "true"
  name: argo-rollouts
  namespace: argo-rollouts
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/component: rollouts-controller
      app.kubernetes.io/instance: argo-rollouts
      app.kubernetes.io/name: argo-rollouts
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/component: rollouts-controller
        app.kubernetes.io/instance: argo-rollouts
        app.kubernetes.io/name: argo-rollouts
    spec:
      containers:
        - args:
            - '--healthzPort=8080'
            - '--metricsport=8090'
            - '--loglevel=info'
            - '--logformat=text'
            - '--kloglevel=0'
            - '--leader-elect'
          image: quay.io/argoproj/argo-rollouts:v1.7.0
          imagePullPolicy: IfNotPresent
          livenessProbe:
            failureThreshold: 3
            httpGet:
              path: /healthz
              port: healthz
              scheme: HTTP
            initialDelaySeconds: 30
            periodSeconds: 20
            successThreshold: 1
            timeoutSeconds: 10
          name: argo-rollouts
          ports:
            - containerPort: 8090
              name: metrics
              protocol: TCP
            - containerPort: 8080
              name: healthz
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /metrics
              port: metrics
              scheme: HTTP
            initialDelaySeconds: 15
            periodSeconds: 5
            successThreshold: 1
            timeoutSeconds: 4
      restartPolicy: Always
      serviceAccountName: argo-rollouts
      terminationGracePeriodSeconds: 30
```

Notice this sub-block:

```yaml
strategy:
    rollingUpdate:
        maxSurge: 25%
        maxUnavailable: 25%
    type: RollingUpdate
```

Already configures a 25% rollout policy, so bumping this controller will gracefully ensure the pods are restarted and placed on the newly available nodes running your latest k8s version.

## Drain Waves

If you notice, there's also a `deployments.plural.sh/drain-wave` annotation.  This is meant to control dependency ordering around application restarts.  Say you have 3 microservices, a, b, and c.

1. A calls into b and c
2. B calls into c
3. C just exposes its api but is otherwise standalone

In that world, you should have a be drain-wave 0, b drain-wave 1, and c drain-wave 2 to minimize the concurrent failures that could happen if the entire call tree were restarted at once.

Oftentimes this sort of manual configuration is not necessary because the restart policies give enough headroom but the resource does provide the optionality for dependency ordering in usecases where it remains necessary.
