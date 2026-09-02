---
title: Plural Artifact Structure
description: >-
  In this guide we will lay out how a Plural artifact is constructed.
---

As mentioned in [Background on Application Installations](/adding-new-application/background-app-install),
the Plural CLI creates a wrapper Helm chart and Terraform module for each installed application and inputs the user provided values for that installation.
Some extra configuration files are necessary in the application's artifact for the Plural API to be able to understand:

- the Helm charts and Terraform modules dependencies to run them through its templating engine
- dependencies on other Plural artifacts
- platform specific components and infrastructure configurations
- as well as Plural's own package and version specs.

As an example, Dagster's artifact `tree` would look like this:

```console
$ pwd
~/Repos/plural-artifacts/dagster
$ tree .
.
├── Pluralfile
├── helm
│   └── dagster
│       ├── Chart.lock
│       ├── Chart.yaml
│       ├── README.md
│       ├── charts
│       │   ├── config-overlays-0.1.1.tgz
│       │   ├── dagster-1.4.10.tgz
│       │   ├── postgres-0.1.16.tgz
│       │   └── test-base-0.1.10.tgz
│       ├── deps.yaml
│       ├── runbooks
│       │   └── scaling-manual.xml
│       ├── templates
│       │   ├── _helpers.tpl
│       │   ├── oidc.yaml
│       │   ├── runbooks.yaml
│       │   └── secret.yaml
│       ├── values.yaml
│       └── values.yaml.tpl
├── plural
│   ├── docs
│   │   ├── private-ingress.md
│   │   └── user-code.md
│   ├── icons
│   │   ├── dagster-primary-mark.png
│   │   └── dagster.png
│   ├── notes.tpl
│   ├── recipes
│   │   ├── dagster-aws.yaml
│   │   ├── dagster-azure.yaml
│   │   └── dagster-gcp.yaml
│   └── tags
│       ├── helm
│       │   └── dagster.yaml
│       └── terraform
│           ├── aws.yaml
│           ├── azure.yaml
│           └── gcp.yaml
├── repository.yaml
├── terraform
│   ├── aws
│   │   ├── deps.yaml
│   │   ├── iam.tf
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   ├── postgres.tf
│   │   ├── terraform.tfvars
│   │   └── variables.tf
│   ├── azure
│   │   ├── deps.yaml
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── variables.tf
│   └── gcp
│       ├── deps.yaml
│       ├── main.tf
│       ├── outputs.tf
│       ├── terraform.tfvars
│       └── variables.tf
└── vendor_images.yaml
```

Let's dissect this artifact's structure.

## Helm

The `helm` directory contains the app's Helm chart as it will be available through the Plural API and used by the Plural CLI to configure and deploy the Kubernetes components into your cluster.
Many artifacts define the Helm charts in terms of their upstream open source versions (if they're actively maintained, allow for required customization and fit Plural's quality standards)
as well as other helper charts, e.g. from Plural's [Module Library](/adding-new-application/module-library).
If any additional resources are necessary, they can be added and templated in the same manner as with any other Helm chart.
Any default chart parametrization goes into your standard `values.yaml` file, most prominently resource requirements or limits, labels, annotations, entrypoint customizations, and so on.

One thing that is unique about a Plural artifact's Helm chart is the ability to template in values from other parts of the infrastructure, that cannot be known ahead of deployment time, in the dedicated `values.yaml.tpl` file.
This enables us to parametrize values for resources that depend on application components that do not live in the cluster, but in your cloud account and that are deployed with terraform and not helm.
The ARN of an AWS role or bucket, or VPC subnet ids are common examples for this.
Another supported use case is to pass output from other Plural deployed applications that live in the same cluster,
or configuration that you can query from the Plural API, e.g. OIDC config if you're using Plural as an OIDC provider for your apps, too.
See [Templating](/adding-new-application/templating) for how powerful this additional templating layer can be.

Plural leverages dependency tracking of applications to achieve a high degree of resource efficiency and deduplication.
Dependencies between artifacts are defined in the recipe files (see below).
Dependencies are also tracked between the Helm charts and Terraform modules of other applications in a dedicated `deps.yaml` file in each chart's or module's directory.
For example, for Dagster's Helm chart you would list required dependencies on:

- the `bootstrap` application's Helm chart
- the `ingress-nginx` application's Helm chart
- the `postrges` operator application's Helm chart

as well as optional dependencies on Dagster's own Terraform modules to convey intent that those are installed before the Helm chart.

```yaml
apiVersion: plural.sh/v1alpha1
kind: Dependencies
metadata:
  application: true
  description: Deploys dagster crafted for the target cloud
spec:
  breaking: true
  dependencies:
    - type: helm
      name: bootstrap
      repo: bootstrap
      version: '>= 0.5.1'
    - type: helm
      name: ingress-nginx
      repo: ingress-nginx
      version: '>= 0.1.2'
    - type: helm
      name: postgres
      repo: postgres
      version: '>= 0.1.6'
    - type: terraform
      name: aws
      repo: dagster
      version: '>= 0.1.0'
      optional: true
    - type: terraform
      name: azure
      repo: dagster
      version: '>= 0.1.0'
      optional: true
    - type: terraform
      name: gcp
      repo: dagster
      version: '>= 0.1.0'
      optional: true
```

## Terraform

The `terraform` directory contains the app's provider-specific terraform modules that encapsulate all application components that do not (or cannot) live inside the cluster.
For each cloud provider, that the artifact offers a bundle for, there will be one under the related directory name.
Most commonly you'd find object storage alongside their IAM resources, or additional node groups, if your app needs a GPU.
Sometimes it will also include Kubernetes resources like service accounts, if their deployment cannot be achieved through the artifact's Helm chart in a convenient manner.

> One peculiarity about the Terraform modules is that, at the very least, they need to contain the Kubernetes namespace for your application.
> This is because during a `plural deploy` with the Plural CLI the `terraform apply` will always run before the `helm install` step.

Just like the Helm chart, the Terraform modules also contain a `deps.yaml` file that inform the Plural API about dependencies on other modules.

```
apiVersion: plural.sh/v1alpha1
kind: Dependencies
metadata:
  description: dagster aws setup
  version: 0.1.2
spec:
  dependencies:
  - name: aws-bootstrap
    repo: bootstrap
    type: terraform
    version: '>= 0.1.1'
  providers:
  - aws
```

## Plural Files

The `plural` directory contains the artifact's packaging information (`plural/recipes`), metadata (`plural/tags` and `plural/icons`), and application specific instructions (`plural/docs` and `plural/notes.tpl`).
On the top-level directory of each artifact you'll also find a`repository.yaml`.

The `repository.yaml` and recipe YAMLs are an integral part of Plural's artifact packaging format.

### `repository.yaml`

```yaml
name: dagster
description: A data orchestration platform for the development, production, and observation of data assets.
category: DATA
private: false
docs: plural/docs
icon: plural/icons/dagster-primary-mark.png
notes: plural/notes.tpl
gitUrl: https://github.com/dagster-io/dagster
homepage: https://dagster.io/
oauthSettings:
  uriFormat: https://{domain}/oauth2/callback
  authMethod: POST
tags:
  - tag: dag
  - tag: data
  - tag: data-pipelines
```

The metadata in this file informs the Plural API about the application this artifact envelopes.
It will store its name, category and description, where it can find the icon and docs to display in the marketplace,
the notes template to prompt after installation, as well as links to any upstream git repository or homepage (if applicable).

`oauthSettings` specifies the URI format for the OIDC callback address and informs the Plural API how to setup the OIDC endpoint for your application if you use it.

> Behind the scenes, every `plural bundle install` triggers the OIDC client creation when you answer with `yes` on the OIDC prompt.
> This happens, because every client needs to be created before a `plural build` which then inputs the client info into the helm chart.

The `private` flag controls whether the artifact's bundles are published publicly or privately on a `plural push` or `plural apply` (see [Publishing](/adding-new-application/publishing)).

### `plural/recipes/dagster-aws.yaml`

```yaml
name: dagster-aws
description: Installs dagster on an aws eks cluster
provider: AWS
primary: true
dependencies:
  - repo: bootstrap
    name: aws-k8s
  - repo: ingress-nginx
    name: ingress-nginx-aws
  - repo: postgres
    name: aws-postgres
oidcSettings:
  uriFormat: https://{domain}/oauth2/callback
  authMethod: POST
  domainKey: hostname
sections:
  - name: dagster
    configuration:
      - name: dagsterBucket
        type: BUCKET
        documentation: s3 bucket for storing dagster logs
        default: dagster
      - name: hostname
        type: DOMAIN
        documentation: fqdn on which to deploy your dagster instance
    items:
      - type: TERRAFORM
        name: aws
      - type: HELM
        name: dagster
```

The recipe file ties a bundle together, with one dedicated recipe per cloud provider.
It informs the Plural API about the bundle's parameter signature, metadata, dependencies and sequence order of installations and upgrades.
Let's step through this file.

- `provider` defines the targeted cloud provider of this recipe.
- For every artifact one of the recipes can be marked as `primary` which will make it possible to simply install with a `plural bundle install <app_name>` (leaving out the `<bundle>`).
- The apps listed in `dependencies` tell Plural on which other Plural bundles this bundle depends on.
  > Most bundles depend on the installation of other Plural applications. For example, every bundle will at least depend on the bootstrap application that packages the cluster itself.
- Similar to `oauthSettings` in the `repository.yaml`, `oidcSettings` in the recipe YAML should specify the same configuration at the bundle level.
- `sections[0].configuration` defines the user-provided values to prompt for during installation .
  This is basically the signature of the bundle, it contains all required user-provided parameters that can be used in templating expressions in the `values.yaml.tpl` or in the terraform module (e.g. in the `.tfvars` file).
  The Plural API has a built-in type checker that will validate any passed string's format against its type, e.g. to guarantee a valid domain name.
  For examples on available types check other Plural artifacts.
  The Plural CLI will store the passed values in the according section in the `context.yaml` as discussed above.
- `sections[0].items` lists the chart and module directories in the `helm` or `terraform` directories that are part of this bundle.

> A bundle can technically have multiple sections, but this feature's not yet used.
