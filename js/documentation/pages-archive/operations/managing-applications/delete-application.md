---
title: Delete an Application
description: How to uninstall your Plural applications.
---

To uninstall applications run the following command in the CLI or Cloud Shell:

```shell {% showHeader=false %}
plural destroy <app-name>
```

This will:

- Destroy all Terraform resources
- Bring down application in your cloud
- Empty the Kubernetes namespace associated with your application

This will **not**:

- Remove application builds from your local Plural Git repository
- Remove application configuration values from `context.yaml` (you are prompted on whether to do this during the destroy process)

We don't remove certain information as it contains required configuration for spinning up
the same instance again. If we removed that information, you would be unable to restore an application after destroying it.
