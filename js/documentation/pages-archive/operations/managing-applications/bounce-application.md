---
title: Bounce an Application
description: How to restart an application to pull in new changes or troubleshoot.
---

To bounce an application, you can either:

- Run `plural bounce <app-name>` in the CLI or Cloud Shell
- Go to the Plural Console, select your application in the top right, then click the `Bounce` button on the Console home page (Builds).

## When to bounce an application

Bouncing an application restarts the appropriate running software in your cloud provider. You may need to bounce an installed application for reasons including:

- Applying changes to an application that require a redeploy
- Resolving transient errors in deployment
- Resolving transient errors with your cloud provider
- Refreshing the Plural Console to get an updated view of your repository

Especially perceptive users may notice that behind the scenes, `plural bounce` runs `helm upgrade` with some special arguments.
