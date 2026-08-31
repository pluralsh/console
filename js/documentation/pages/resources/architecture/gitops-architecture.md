# Plural GitOps Distribution Architecture

Before getting into detail about how Plural’s Gitops architecture works, a high level overview of Plural’s architecture is likely useful context.  To simplify, Plural provides a hub-spoke architecture where there’s a central management plane (hub) that exposes a control api to agents on individual managed clusters (spokes). These clusters poll at a frequent interval for changes or send back information to the management hub, which then stores and indexes the information for presentation to our UI or integration with our APIs.  Visually, it looks something like this:

![Plural Architecture](/assets/deployments/architecture.png)

As far as our integration with Git and SCM providers, almost the entire concern is with the management hub cluster, although it is important to understand the cluster-level agent plays a role as well will be, which be explained a bit too.

## GitOps architecture

Plural implements the distribution process for all Git (and helm and OCI) manifests with what you could consider a **Git-aware CDN architecture.** This is described below:

The management cluster is given a request from an agent to deliver a tarball. This is uniquely identified by a computed digest from the configuration in our api, and the management cluster searches for it in a multilevel cache.  The cache works as follows:

1. A node-level cache by digest, which if its found, is immediately read from disk and returned.
2. A sharded cache, w/ one instance per git repository, which is used if the node level cache misses. Fetches to this cache are also proxied through its node’s node-level cache, ensuring that it is warmed, or also potentially getting another cache hit as a prior request might have already warmed that cache.
3. An agent, managed by the erlang runtime, which maintains the current state of the sharded cache by refetching from Git roughly once every 2 minutes.  This allows us to find the state of upstream changes relatively quickly but not pressure the SCM provider hosting the git repository as well.

The overall architecture visually looks something like the following:

![GitOps Cache Architecture](/assets/reference/git-cache.png)

## Git Agent

The git repository agent is relatively novel and has a defined workflow.  It will:

1. Refetch on a 2m jittered poll interval from the upstream repository
2. Maintain a local checkout of the repository.  This allows it to still serve manifests even in the event of an upstream Git outage.
3. Maintain its sharding logic.  This is done via native erlang clustering alongside a periodic shard movement process to handle scaling events in the cluster.  The sharding guarantees only one instance of a git agent exists in the cluster for each git repository and allows for transparent discovery and rpc within the cluster.

## Delivery To Cluster Agents

The Plural agent running on each cluster (our deployment-operator) will be periodically asking for a new tarball from the management hub cluster.  This process is also cached.  The caching logic is as follows:

1. The operator first asks for the current digest of the service’s tarball. This is used to compare to its local cache and detect if a content change has occurred.
2. If the digest has changed, a full download is initiated.  Full downloads are also requested periodically (2h or so) just to ensure eventual consistency.

This local caching defrays almost all tarball download pressure from the agent, as content changes on a relatively infrequent basis throughout the system.  In our internal cases, you see about 1 tarball downloaded an hour with this caching mechanism in place, minimizing network bandwidth used and allowing the management hub to remain quite lean.  You can see some results in one of our scale tests [here](https://www.plural.sh/blog/scale-testing-plural-managing-1100-kubernetes-clusters-with-just-over-3cpu/).

## Benefits of Plural’s Approach

There were a few key design considerations we have found this architectural approach ensures:

1. Shield self-hosted git providers from excess traffic.  Since our Git cache fetches on a defined interval from exactly one internal thread, this gives a very clear guarantee as to how much traffic hits your source control management system.
2. Shield Plural from Git-related outages.  Even Github is fairly unreliable, and by maintaining a local checkout and a deep multilayer cache, all of which can serve traffic without a live upstream.
3. Enhance scalability.  We want Plural to easily handle thousands of clusters.  The CDN-like caching and distribution of gitops artifacts within the system allows for simplistic horizontal scaling and rapid response times throughout the hub cluster.  The local caching in our agent allows for additional scalability as well.
4. Minimize necessary bandwidth.  GitOps can be bandwidth intensive if you’re overfetching the source manifests on each reconciliation.  Our agent caching reduces that in the steady state case to just a very minimal digest fetch.