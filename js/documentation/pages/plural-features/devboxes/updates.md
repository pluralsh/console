---
title: How devbox updates work
description: How Plural delivers new agents and daemon versions to devbox instances, and what an update means for your work
---

## Overview

Plural keeps the coding agents and the devbox daemon in your devboxes current without rebuilding your images. Each deployment operator release ships them, and existing instances move to the new versions in place, keeping your home directory and agent threads.

This page explains the pieces involved, how an update reaches an instance, and what you see in Plural while it happens.

## The pieces

A devbox instance runs two images side by side in one sandbox, sharing the instance's home volume (`/home/dev`):

{% hierarchy label="One instance · the runtime installs into the home, the environment runs from it" %}
{% hierarchy-node depth=0 name="Devbox runner" detail="your spec.image, spec.agents and the runtime Plural ships" /%}
{% hierarchy-node depth=1 name="Template revision" detail="built once per change · golden boot · snapshot" /%}
{% hierarchy-node depth=2 name="Instance" detail="started, suspended and moved by the devbox gateway" /%}
{% hierarchy-node depth=3 name="Environment image" detail="your OS, toolchains and CLIs · runs the daemon and agents" /%}
{% hierarchy-node depth=3 name="Runtime sidecar" detail="installs the daemon and the runner's agents" /%}
{% hierarchy-node depth=3 name="Home volume /home/dev" detail="your files, threads and the installed runtime" /%}
{% /hierarchy %}

| Piece | What it is | Who owns it |
|---|---|---|
| Environment image | The image you and the agents work in, set in the runner's `spec.image`. See [Environment images](/plural-features/devboxes/environment-images). | Your platform team |
| Runtime image | The devbox daemon, the coding agents (Claude Code, Codex, OpenCode, Gemini CLI, pi), their ACP adapters, Playwright MCP and the Node.js they run on. | Plural, one per deployment operator release |
| Runtime sidecar | A small container from the runtime image in every instance. When the instance starts, it installs the daemon and only the agents the runner lists in `spec.agents` into the home volume, then the environment image runs them from there. | Plural |
| Template revision | A fixed description of how the runner's instances run: the environment image, the runtime image, the agents and the rest of the runner's spec. The operator builds a new revision whenever any of these changes. | The deployment operator |
| Golden boot | The first boot of a new revision, done once before anyone uses it. It installs the runtime, runs the runner's bootstrap work, and is saved as a snapshot that every new instance of that revision starts from. | The deployment operator |
| Devbox gateway | Starts, suspends and resumes instances for Plural, and moves an instance from one revision to another. | The deployment operator |
| Home storage | Where `/home/dev` lives. By default it's part of each instance's snapshots. With JuiceFS or ZeroFS (`spec.home.storage`) it's a volume of its own that follows the instance between nodes. | Your platform team chooses |

## How an update reaches an instance

1. **A new revision is built.** A deployment operator release with a new daemon or agent version, or a change to the runner, makes the operator build a new revision. The golden boot and a check that every agent answers run in the background. Until the revision is ready, everything keeps using the current one.
2. **New instances start on it.** They start from the new revision's golden snapshot, with the agents already installed, in a few seconds.
3. **Existing instances move.** How depends on the runner's `spec.instanceUpdatePolicy`:
   * With the default, `onResume`, a suspended instance moves when it is next resumed. A running instance is never interrupted.
   * With `manual`, instances stay on their revision until a user or an admin updates them from Plural.
4. **Only what changed is copied.** The sidecar compares what's in the home with the new runtime and copies only the components that differ. A daemon-only update copies about 20 MB; an agent update copies that agent.
5. **Failed starts roll back.** If the instance doesn't start on the new revision, the gateway moves it back to the revision it came from, and it resumes there.

## What you see in Plural

* **Update available.** An instance behind its devbox's current version shows an "Update available" chip. Its owner, or anyone who can manage it, can choose "Update instance" to move it now. A running instance restarts.
* **Resuming.** Opening a suspended instance resumes it. If it moves to a new revision on the way, the resume takes a little longer, and the resume button spins until the instance is running.
* **Updating a whole devbox.** In the devbox's settings (Settings, AI, Devboxes), the Updates section lists outdated instances and their daemon and image versions. "Update outdated instances" starts an update campaign, which moves suspended and idle instances, a few at a time, and leaves instances people are using alone, checking again just before it restarts one.
* **Forced updates.** For security fixes, an admin can force an update with a notice period in minutes. People using an affected instance see a notice with the reason and a countdown: "This instance restarts for a required update". At the deadline the instance restarts on the current version, or earlier if they choose "Update now". Someone who starts using an instance later in the campaign gets the full notice too.

## What an update keeps and resets

An update restarts the instance on the new revision. It is a fresh boot, not a resume from memory.

| Kept | Reset |
|---|---|
| Your home directory: files, repositories, credentials and settings | Every running process, terminal and agent turn |
| Agent threads and their history | Anything installed outside the home, for example with `apt-get` |
| The instance's identity and its place in Plural | The rest of the filesystem, back to the environment image |

To reinstall things after every restart, put the commands in `~/.config/devbox/boot.sh`. It runs when an existing instance boots fresh.

## How long it takes

Rough figures from a test cluster; your cluster's disks and object storage change them.

| What | About |
|---|---|
| Starting a new instance | a few seconds, under a second with a JuiceFS home |
| Resuming without an update | under a second |
| Resuming onto a daemon-only update | 5 seconds |
| Resuming onto an agent update or an added agent | 5 to 15 seconds |
| An update requested for a running instance | suspending it first, 5 to 25 seconds, then the resume above |
| Building a new revision (nobody waits for it) | 1 to 4 minutes, including the agent check |

## Limits

* **Changing a JuiceFS or ZeroFS home.** An instance only moves to a revision with the same home volume. Changing `spec.home.storage`, `spec.home.storageClassName` or `spec.home.size` gives new revisions another volume, so existing instances stay where they are. The same goes for JuiceFS instances created before the deployment operator gave all of a runner's revisions one StorageClass. Create a new instance to use the newer revision.
* **Removing an agent.** Threads keep the agent they were started with. After an agent is removed from `spec.agents`, instances created before stay on their revision when they resume and in ordinary update campaigns. They only move when someone updates them on purpose: their owner with "Update instance", or a forced update at its deadline. Their threads on the removed agent then can't continue.
* **Snapshots on JuiceFS or ZeroFS homes.** Starting an instance from a snapshot isn't supported yet for these homes.
* **Environment images.** The runtime's agents need glibc 2.28 or newer. On an image without it, the runner's revision fails with a message that says so. See the [requirements](/plural-features/devboxes/environment-images#requirements).

See the [Agent API reference](/api-reference/kubernetes/agent-api-reference#devboxrunner) for `spec.instanceUpdatePolicy`, `spec.home` and `spec.runtime`.
