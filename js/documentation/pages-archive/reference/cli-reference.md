---
title: CLI Command Reference
description: >-
  Overview of all Plural CLI commands.
---

To install the Plural CLI, use:

```
brew install pluralsh/plural/plural
```

Refer to the CLI quickstart for more information.

{% callout severity="info" %}
Make sure to update your CLI to the latest version to pick up any new features.
{% /callout %}

## Synopsis

```
plural [options] <command> [parameters]
```

Use `plural command help` for information on a specific command. The synopsis for each command shows its parameters and their usage. Optional parameters are shown in square brackets.

## Global Options

`--profile-file [FILE]` configure your config.yml profile FILE [$PLURAL_PROFILE_FILE]

`--encryption-key-file [FILE]` configure your encryption key FILE [$PLURAL_ENCRYPTION_KEY_FILE]

`--help, -h` show help

## Commands

**General**

`version, v, vsn` Gets cli version info

`build, b` Builds your workspace

`deploy, d` Deploys the current workspace. This command will first sniff out git diffs in workspaces, topsort them, then apply all changes.

`diff, df` Diffs the state of the current workspace with the deployed version and dumps results to diffs/

`bounce` Redeploys the charts in a workspace

`destroy` Iterates through all installations in reverse topological order, deleting helm installations and terraform

`init` Initializes plural within a git repo

`preflights` Runs provider preflight checks

`bundle` Commands for installing and discovering installation bundles

`stack` Commands for installing and discovering plural stacks

`packages` Commands for managing your installed packages

`link` links a local package into an installation repo

`unlink` Unlinks a linked package

`help, h` Shows a list of commands or help for one command

**API**

`repos` View and manage plural repositories

`api` Inspect the plural api

**Debugging**

`watch` Watches applications until they become ready

`wait` Waits on applications until they become ready

`info` Generates a console dashboard for the namespace of this repo

`proxy` Proxies into running processes in your cluster

`logs` Commands for tailing logs for specific apps

`ops` Commands for simplifying cluster operations

`ai` Utilize openai to get help with your setup

**Miscellaneous**

`utils` Useful plural utilities

`vpn` Interacting with the plural vpn

**Publishing**

`apply` Applies the current pluralfile

`test` Validate a values templace

`push` Utilities for pushing tf or helm packages

`template, tpl` Templates a helm chart to be uploaded to plural

`from-grafana` Imports a grafana dashboard to a plural crd

**User Profile**

`login` Logs into plural and saves credentials to the current config profile

`import` Imports plural config from another file

`crypto` Plural encryption utilities

`config, conf` Reads/modifies cli configuration

`profile` Commands for managing config profiles for plural

**Workspace**

`create` Scaffolds the resources needed to create a new plural repository

`repair` Commits any new encrypted changes in your local workspace automatically

`validate, v` Validates your workspace

`topsort` Renders a dependency-inferred topological sort of the installations in a workspace

`dependencies, deps` Prints ordered dependencies for a repo in your workspace

`serve` Launch the server

`shell` Manages your cloud shell

`workspace, wkspace` Commands for managing installations in your workspace

`output` Commands for generating outputs from supported tools

`build-context` Creates a fresh context.yaml for legacy repos

`changed` Shows repos with pending changes
