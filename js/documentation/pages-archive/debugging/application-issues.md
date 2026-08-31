---
title: Application Issues
description: Figuring out what is going wrong with your deployed applications.
---

Issues with applications are often due to issues with the underlying Pods. You can use `kubectl` commands to get, find logs for, and delete pods as necessary. Note that Plural automatically configures `kubectl` for use with your Plural cluster.

## With Plural CLI

To find Pods related to an application with the CLI, you can run:

```
kubectl get pods -n <application-name>
```

If you see failed Pods, you can get the logs for the Pods by running:

```
kubectl logs -n <application-name> <name-of-pod>
```

We also curate a list of helpful logging shortcuts for each application, which you can use the `plural logs` subcommand for, eg with

```
plural logs list <application> # shows all log tails available
plural logs tail <application> <name> # tails that specific log
```

To delete problematic Pods, run:

```
kubectl delete pod <pod-name>
```

In most cases, kubernetes will restart the pod for you. You can always also run `plural bounce` to regenerate your deleted Pods.

## With Plural Console

If you have the Plural Console installed, you can debug your Kubernetes Pods with the following steps:

1. Navigate to the Application Overview tab, select the relevant application and click on the `Components` option in the menu on the left. Click on the failing component.
2. The `Pods` section at the top of the screen should have the failing pod; hit the red trash can button located on the right of the screen to delete it.

3. Head back to the `Builds` tab in the sidebar and create a `Bounce` build to redeploy your deleted Pods.
