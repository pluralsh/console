---
title: Background on Application Installations
description: >-
  A good unerstanding of an app's journey into your cluster will go a long way if you want to contribute your own application to the marketplace.
---

In this guide we will lay out how your user provided values tie in with the deployment process as it relates to the configuration and templating of the app.

When a user sets up a new Plural workspace in a git repository (we'll call that a _deployment repository_ going forward) a `workspace.yaml` file is created that stores global values for that cluster such as the cloud account and region, the cluster and VPC name and what subdomain all the applications will be hosted under.
Next, the user can install an application bundle using the `plural bundle install <app_name> <bundle>` CLI command.

> Most applications come with more than one bundle, one for each targeted cloud provider.

The CLI will then prompt the user for inputs needed to setup that application, along with any dependencies of the application.
These inputs are saved in the `context.yaml` file.

For example, let's have a look how the `tree` of a deployment repository, where we installed Dagster with `plural bundle install dagster dagster-aws` (among others), might look like:

```console
$ pwd
~/Repos/deployment-repository
$ tree -L 1 .
.
├── bootstrap
├── cert-manager
├── console
├── dagster
├── postgres
├── terraform.tfstate
├── workspace.yaml
└── context.yaml
```

The `workspace.yaml` would look like this:

```yaml
apiVersion: plural.sh/v1alpha1
kind: ProjectManifest
metadata:
  name: pluraldev
spec:
  cluster: pluraldev
  bucket: pluraldevsh-tf-state
  project: '123456765432'
  provider: aws
  region: us-east-2
  owner:
    email: plural-dev@pluraldev.sh
  network:
    subdomain: dev.plural.sh
    pluraldns: false
  bucketPrefix: pluraldev
  context: {}
```

And the `context.yaml` like this. In the `spec.configuration` section you can see the recorded user input for each artifact.

```yaml
apiVersion: plural.sh/v1alpha1
kind: Context
spec:
  bundles:
  - repository: dagster
    name: dagster-aws
  - repository: plural
    name: plural-aws
  - repository: console
    name: console-aws
  - repository: bootstrap
    name: aws-efs
  - repository: cert-manager
    name: cert-manager-aws
  - repository: ingress-nginx
    name: ingress-nginx-aws
  buckets:
  - pluraldev-pluraldev-dagster
  domains:
  - console.dev.plural.sh
  - dagster.dev.plural.sh
  configuration:
    bootstrap:
      vpc_name: pluraldev
    cert-manager: {}
    console:
      admin_name: admin
      console_dns: console.dev.plural.sh
      ...
      repo_url: git@github.com:pluralsh/deployment-repo.git
    dagster:
      dagsterBucket: pluraldev-pluraldev-dagster
      hostname: dagster.dev.plural.sh
    ingress-nginx: {}
    postgres:
      wal_bucket: pluraldev-pluraldev-postgres-wal
```

Next, the user would run `plural build` or `plural build --only <app name>` which will create a wrapper Helm chart and Terraform module for that app under a dedicated directory in the deployment repository.
The wrapper Helm chart and Terraform module depend on the application Helm chart(s) and Terraform module(s) it gets from the application's artifact repository via the Plural API.
During this step the CLI will generate the `default-values.yaml` for the wrapper helm chart and `main.tf` for the wrapper Terraform module using its templating engine.
More precisely, `default-values.yaml` will contain the interpolated templated values from its `values.yaml.tpl` (see [Templating](/adding-new-application/templating)) that are derived by injecting the values saved in the `context.yaml` at `spec.configuration`.

For example, after the `plural build --only dagster` command, the `tree` of the built Dagster application in your deployment repository would look like this:

```console
$ pwd
~/Repos/deployment-repository/dagster
$ tree .
.
├── build.hcl
├── deploy.hcl
├── diff.hcl
├── helm
│   └── dagster
│       ├── Chart.lock
│       ├── Chart.yaml
│       ├── charts
│       │   └── dagster-0.1.44.tgz
│       ├── default-values.yaml
│       ├── templates
│       │   ├── NOTES.txt
│       │   ├── application.yaml
│       │   ├── license.yaml
│       │   └── secret.yaml
│       └── values.yaml
├── manifest.yaml
├── output.yaml
└── terraform
    ├── aws
    │   ├── deps.yaml
    │   ├── iam.tf
    │   ├── main.tf
    │   ├── outputs.tf
    │   ├── postgres.tf
    │   └── variables.tf
    ├── main.tf
    └── outputs.tf
```

Here you can see the wrapper Helm chart in `./helm/dagster` around the `./helm/dagster/charts/dagster-0.1.44.tgz`, i.e. the artifact's Helm chart that the Plural CLI downloads for you.
Similarly the wrapper Terraform module in `./terraform` will contain a local copy of the artifact's Terraform module inside `./terraform/aws`.
