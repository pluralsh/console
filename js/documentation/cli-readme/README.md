# Welcome to Your Plural Repo

This is the repo that will house all your Plural installations for this cluster. We'll give you a quick walkthrough how everything works here. In general, there are two commands you'll run in your Plural workflow:

```
plural build // generates infrastructure as code for your installations
plural deploy // deploys your IAC resources in dependency-order
```

If you want to install a new app, you can run:

```
plural bundle install APP BUNDLE_NAME
```

and you can discover the various cloud provider bundles for an app with `plural bundle list APP`. To traverse our marketplace, run `plural repos list` or go to [https://app.plural.sh/marketplace](https://app.plural.sh/marketplace)
If you want an at-a-glance view of the health of any application, you can run:

```
plural watch APP_NAME
```

but the best way to manage and monitor your applications is with the Plural Console, which you can install with `plural bundle install console console-{aws,gcp,azure,etc}`. We strongly recommend doing this.

## Workspace Structure

We generate infrastructure as code resources in a consistent format:

```
<app>
- helm
  - <app>
    - helm
      - templates
        - ...
      - values.yaml # custom config values you provide
      - default-values.yaml # configuration we generate w/ `plural build`
- terraform
  - <submodule>
    - ...
  - main.tf # can override submodule configuration here, see that file for more info
```

In general we expect you to customize the repo as you wish, and any standard Terraform or Helm command should work as expected. Let's say you wanted to switch the database for an app to RDS. To do this, you can use the app's dedicated Terraform folder in the repo to define the database and inject its secret into Kubernetes right there.
There are two other metadata files you should be aware of as well:

- `context.yaml` - this is the initial app configuration you provide when running `plural bundle install`. We use this to generate the resources that are present in your app folder above. You can reconfigure settings here if you'd like, or occasionally enable different configurations. Airbyte basic auth requires a `context.yaml` change for instance.

- `workspace.yaml` - this is the high level workspace metadata about your workspace, like the cloud account, cluster name, dns domain, etc. For the most part, this file should remain read-only.

## Secret Management

We automatically encrypt this repo using a go reimplementation of [git-crypt](https://github.com/AGWA/git-crypt). You'll be able to see the AES key you're currently using with `plural crypto export`. We also drop the key fingerprint into the repo at `.keyid` to validate and provide appropriate error messages.

It's strongly recommended you backup this key, and we provide a backup API for you with `plural crypto backups create`. You can sync any backup with `plural crypto backups resource NAME`. You can also use popular solutions for this like 1password, Vault or your cloud's secrets manager.

If you reclone this repo on a new machine, its contents will be fully encrypted. In that case you'll need to set up the encryption credentials for the repo, then run:

```
plural crypto init
plural crypto unlock
```

## Destroying Your Cluster

You can tear down the cluster at any time using `plural destroy`. If it gets jammed on a specific app, you can simply rerun with `plural destroy --from APP_NAME`.

In break glass scenarios where destroy doesn't want to behave, the bulk of the cloud resources are in the bootstrap app, and you can simply run `cd bootstrap && terraform destroy` manually. If you encounter this feel free to let us know so we can improve our packaging.

## Support

If you have any issues with plural or any of the apps in the catalog, we pride ourselves on providing prompt support. You can join our Discord [here](https://discord.com/invite/bEBAMXV64s), and we'll try to troubleshoot the issue for you. You can find common troubleshooting tips [here](https://docs.plural.sh/reference/troubleshooting) as well.
