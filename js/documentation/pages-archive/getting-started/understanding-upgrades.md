---
title: Understanding The Plural Upgrade Processs
description: >-
  A brief overview of how upgrades work within Plural
---

## Overview

The purpose of this doc is to help users understand the nuts-and-bolts of how upgrades work with Plural. There are a few main concepts you need to get a grasp of:

- The states an installation of an app can be in as versions change
- Release channels and how they control upgrades
- The individual upgrade queue for a cluster
- Cluster Promotions and how they control upgrades

## Installation States

Any Plural user can have a set of installations bound to them. These include an installation of a specific app (e.g. Airbyte) and submodules for that app (e.g. a helm chart at some version, and a terraform module at that version). At any given point in time that installation can be:

- Synced/Unsynced - This basically means the installation has changed versions in our API but has not yet been applied in your infrastructure. Generally running `plural deploy` for that app will mark it as synced.
- Locked/Unlocked - This state is used when a manual change is needed. Some changes – like kubernetes upgrades or heavy app migrations – need to be applied manually and not by our console, and this state is meant to pause upgrades for that app until you explicitly mark it as having been applied with `plural repos unlock <app>`.

These states are all visible in our [cluster view](https://app.plural.sh/overview/clusters) in [app.plural.sh](https://app.plural.sh) as shown here:

![](/assets/inst-locked-unlocked.png)

## Release Channels

An app can have any number of release channels which are basically named tags for specific versions of an app. In general these will be:

- latest - always the last version managed by our system
- stable - a channel we frequently maintain based on integration tests we’ve written for apps
- <vsn> - a channel for specific app versions

You can toggle any release channel in the [/clusters](https://app.plural.sh/overview/clusters) page of [app.plural.sh](https://app.plural.sh). This will often result in a lot of your installation being rewired, which will then flush to your console. Here’s an example of the upgrade channels for an airbyte installation:

![](/assets/upgrade-channel.png)

## The Upgrade Queue

When a new version of a helm chart or terraform module is pushed into a release channel, our API will update your installation for you and then push an upgrade into your upgrade queue for the console to apply for you. This is an ordered list, which is meant to be dependency-ordered to properly guide the console to safely apply an upgrade.

That said, the source of truth of what you install is your terraform/helm installation in our API, and this is really a sequence of commands the console is meant to execute on your behalf.

You can see an upgrade queue for a cluster in the [clusters tab](https://app.plural.sh/overview/clusters) in app.plural.sh at any point in time as well.

## Cluster Promotions

Cluster promotions are a mechanism to control all upgrades to a given cluster to allow for dev -> staging -> prod separation. It’s a useful risk management mechanism especially if you’re using apps like airflow that has custom code you inject in the airflow instance that needs to be tested for yourself alongside any given version.

You must be a Pro or Enterprise user of Plural to access promotions, but if you are, it’s a pretty simple process to setup new promotions, this video will give you a walkthrough:

{% embed url="https://www.youtube.com/watch?v=ZGXZmqelHB0&ab_channel=Plural" aspectRatio="16 / 9" /%}

The way the promotion mechanism works is it defers all upgrades for the cluster up to a given point in time. When you promote from a source cluster, it will move that waterline to whatever the source cluster’s waterline was (or the current time if it doesn’t have a source cluster of its own). This allows you to set up long promotion chains like `dev -> staging -> gamma -> prod` as you might like.

This can snowball changes which might cause some confusion if some of those changes were manual changes that result in a `LOCKED` installation. We’ll still deliver emails about those as before, and you’ll be able to see the locked state in the `/clusters` view.
