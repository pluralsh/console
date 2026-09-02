---
title: Add Applications to your Cluster
description: How to install additional applications to a running Plural cluster
---

To add a new application to your Plural cluster, you can use either the Cloud Shell or CLI (depending on your setup) or install directly from the Plural Console.

## Install from the Cloud Shell

If you originally set up your Plural cluster with the in-browser Cloud Shell option, you can easily add new installations from within the Cloud Shell. Navigate to the Cloud Shell tab and click the "Install" button in the left-hand pane.

![](/assets/operations/cloud-shell-install.png)

This will re-launch your Install Wizard, where you can configure and deploy new applications. For more detailed information on the Install Wizard, refer to the [In-Browser setup guide](/getting-started/cloud-shell-quickstart).

If for any reason your deployment fails, try rebuilding and redeploying the application by clicking "Rebuild" from the installed apps dropdown.

![](/assets/operations/application-rebuild.png)

## Install from the CLI

If you originally set up your Plural cluster with the local CLI, you can add new installations with a CLI command.

Run `plural bundle list <app-name>` to find installation commands and information about each application available for install.

To install applications on Plural, run:

```
plural bundle install <app-name> <bundle-name>
```

As of CLI version 0.6.19, the bundle name can be inferred from primary bundles, optionally shortening the command to:

```
plural bundle install console
```

After running the install command, you will be asked a few questions about how your app will be configured, including whether you want to enable **Plural OIDC** (single sign-on).

With all new bundles installed, run:

```shell {% showHeader=false %}
plural build
plural deploy --commit "added new applications"
```

Once `plural deploy` has completed, you should be ready to log in to your application at `{app-name}.{domain-name}`.

## Install from the Plural Console

You can also easily install new applications from the Plural Console associated with a given cluster. Navigate to your Console and click the "Install" button in the top right corner.

![](/assets/operations/console-install.png)

This will bring up the in-Console Install Wizard, where you can configure and deploy new applications. Once you're done configuring, you can track the deployment of your new apps from the Builds page.
