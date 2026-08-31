---
title: Connect to an Application DB
description: How to connect to the underlying database for a deployed application.
---

For various reasons, you may want to connect to the underlying database for an application. This could be for routine operations, verifying state, or for surgical procedures.

## Connecting with the Plural CLI

You can list all possible proxies for an application by running:

```shell {% showHeader=false %}
plural proxy list <app-name>
```

You can connect directly to the database with the following command:

```shell {% showHeader=false %}
plural proxy connect <app-name> db
```

## Connecting with the Plural Console

1. Choose the application you want to connect to from the Application Overview tab.
2. Navigate to the `Components` tab located in the left side bar.
3. Click on the component named `apps/statefulset plural-<app-name>`
4. Click on the Pod in the section, likely named `plural-<app-name>-0`
5. In the Containers section, where it says `container: postgres`, there is a Shell icon to the right of it. Click on it to create a terminal instance.
6. Enter the command `su postgres && psql` to access Postgres.
