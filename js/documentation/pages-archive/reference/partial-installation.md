---
title: Continue a Partial Deployment
description: How to fix a failure in a partially deployed cluster
---

Occasionally things will happen which will prevent Plural from fully deploying your cluster. Some common causes are:

- not extending cloud quotas sufficiently
- using underprivileged cloud creds to apply all the needed terraform
- slight misconfiguration (eg using an existing resource name)

In general there are two paths, resolve the issue or start from scratch. This will show you how to handle either one and some pitfalls that might happen.

## Restart From Scratch

Generally we'd recommend this approach as its by far the cleanest. The first thing you'd want to do is wipe all resources from the old cluster. A simple shortcut for this would be to run:

```sh
plural destroy bootstrap
```

This will destroy the cluster and its vpc directly. You should also run `plural repos reset` to wipe all installations in our api and you might also need to go to https://app.plural.sh/account/domains to delete any stale dns entries associated with your cluster. DNS records are owned by a cluster and cannot be created if an old cluster references them.

If you were using the cloud shell to create your cluster, we also recommend you delete the cloud shell using the `Delete cloud shell` button in the three dots menu in the top right of the shell.

Once all the cleanup has been done, you should be able to start fresh. I recommend renaming the cluster and vpc to a new name to avoid any possible conflicts with the old one, and potentially chose a new bucket prefix as well. This will minimize any risk of naming conflict. From there you should be able to restart the deployment from scratch.

## Fix existing deployment

Sometimes the issue is pretty clear and you can resolve it quickly, eg giving a few more permissions to an IAM role or extending a cloud quota. In that case, here are a few pointers to help guide you in unjamming your deployment.

- you can safely retry `plural deploy` at any time. The command is meant to bypass already-run steps and detect local changes. The terraform and helm also have internal mechanisms to guarantee idempotency and so it is generally safe to run
- you might need to reconfigure settings in `context.yaml` then rerun a `plural build` if you have a misconfiguration. All bundle inputs are persisted there.
- avoid reusing the same dns name multiple times, as it can cause thrashing in registering dns records.

To better understand the workspace structure in general, I recommend reading the `README.md` file we persist in the repo for you as well.

Another pointer, if for whatever reason you committed changes early, you might find this output:

```
➜ plural deploy
Deploying applications [] in topological order


==> Commit and push your changes to record your deployment
```

The `plural deploy` command by default filters apps by whatever has a local uncommitted change in the git repository. If nothing is there to commit it will think there's nothing to deploy. You can bypass that by running `plural deploy --all`. This will happen pretty often, especially if the cloud shell was turned off in the background due to being idled for a while.
