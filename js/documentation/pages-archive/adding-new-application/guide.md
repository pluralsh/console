---
title: Guide on Creating a New Application Artifact
description: >-
  This guide is for anyone who wants to make an open-source application available on the Plural marketplace and create a new Plural artifact.
---

To add your own application, you'll need the Helm chart for your application and corresponding Terraform.

## 1. Create a new directory in plural-artifacts

Clone the [plural-artifacts](https://github.com/pluralsh/plural-artifacts) repository

```
git clone https://github.com/pluralsh/plural-artifacts.git
```

For this getting started guide, let's pretend that we are onboarding Hasura. We have a useful make target to scaffold some of the necessary stubs for integrating with Plural.

```
plural create
```

The repository structure after running the `make` command should look something like this:

```
hasura/
    Pluralfile
    helm
    plural
    repository.yaml
    terraform
```

In the steps below we will go through and fill out the stubs.

## 2. Add your Helm chart

This section assumes familiarity with helm, the Kubernetes package manager. If you have not worked with helm before, it's strongly recommended that you read through the helm docs to understand core helm concepts, particularly [helm templates](https://helm.sh/docs/chart_template_guide/getting_started/) and helm template values.

### Getting Started with Helm

From the root of your newly created `hasura` directory, navigate to the helm chart.

```
cd helm/hasura
```

A helm chart is organized as a collection of files inside of a directory:

```
hasura/
  Chart.yaml          # A YAML file containing information about the chart
  values.yaml         # The default configuration values for this chart
  values.schema.json  # OPTIONAL: A JSON Schema for imposing a structure on the values.yaml file
  charts/             # A directory containing any charts upon which this chart depends.
  templates/          # A directory of templates that, when combined with values,
                      # will generate valid Kubernetes manifest files.
```

The `Chart.yaml` file contains a description of the chart. You can access it from within a template.

The `templates` directory is for template files. When Helm evaluates a chart, it will send all of the files in the `templates` directory through the template rendering engine. It then collects the results of those templates and sends them on to Kubernetes.

The `values.yaml` file is also important to templates. This file contains the _default values_ for a chart. These values may be overridden by users during `helm install` or `helm upgrade`.

You should also see a `deps.yaml` file. This is a Plural file used to track dependencies and sequence order of installations and upgrades.

### Fill out Chart.yaml

Open up the `Chart.yaml` file.

`Chart.yaml` is a yaml file containing information about the chart. You can refer to the helm documentation for [a comprehensive list of fields](https://helm.sh/docs/topics/charts/#the-chartyaml-file) in the chart.

The yaml is largely self-documenting. The field to pay attention to is the field at the end, `dependencies`. If your open source project has an existing helm chart (for example on ArtifactHub), this is where you'll want to link it.

```yaml
dependencies:
  - name: hasura
    version: 1.1.6
    repository: https://charts.platy.plus
```

### Fill out the templates directory

Next, let's fill out the `templates` directory. Recall that the `templates` directory is for template files. When Helm evaluates a chart, it will send all of the files in the `templates` directory through the template rendering engine. It then collects the results of those templates and sends them on to Kubernetes.

The Plural platform includes a number of custom resources that you might find useful to fully productionize your application and can copy and paste over for your own use:

- [dashboard.yaml](/adding-new-application/plural-custom-resources#dashboards.yaml) -- creates dashboards in the console that reference Prometheus metrics
- [runbook.yaml](/adding-new-application/getting-started-with-runbooks/runbook-yaml) -- creates interactive tutorials in the console that show how to perform common maintenance tasks. For more documentation on runbooks refer [here](/adding-new-application/getting-started-with-runbooks).
- [proxies.yaml](/adding-new-application/plural-custom-resources#proxies-yaml) -- wrappers around kubectl port-forward and kubectl proxy which allow you to get shells into running pods, databases or access private web uis
- [configurationOverlay.yaml](/adding-new-application/plural-custom-resources#configurationoverlay-yaml) -- creates form fields to modify helm configuration within the console

![](</assets/image (2).png>)

- logfilter.yaml

### Fill out deps.yaml

The `deps.yaml` file is a Plural file that is used for determining the sequence of installations and updates. It should look something like this:

```yaml
apiVersion: plural.sh/v1alpha1
kind: Dependencies
metadata:
  application: true
  description: Deploys hasura crafted for the target cloud
spec:
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
      repo: hasura
      version: '>= 0.1.0'
      optional: true
    - type: terraform
      name: azure
      repo: hasura
      version: '>= 0.1.0'
      optional: true
    - type: terraform
      name: gcp
      repo: hasura
      version: '>= 0.1.0'
      optional: true
```

## 3. Add your cloud config

From the root of the `hasura/` directory (not the one on `helm/` directory but its parent directory), navigate to the `terraform/` directory. Terraform is a tool for creating, updating, and destroying cloud infrastructure via configuration rather than a graphical user interface. If you are not familiar with it, we suggest reading through the [Terraform docs](https://www.terraform.io/language). The files that are located inside this directory are responsible for creating various cloud objects -- i.e. Kubernetes namespaces, AWS IAM roles, and service accounts.

```
cd terraform
```

You should see three folders:

```
terraform
  aws
  azure
  gcp
```

They each have the same structure:

```
terraform/aws
  deps.yaml
  main.tf
  terraform.tfvars
  variables.tf
```

[`main.tf`](https://learn.hashicorp.com/tutorials/terraform/module-create?in=terraform/modules#main-tf) will contain the main set of configuration for your Terraform module. You can also create other configuration files and organize them however it makes sense for your project. It will look something like this:

```Terraform
resource "kubernetes_namespace" "hasura" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/managed-by" = "plural"
      "app.plural.sh/name" = "hasura"
    }
  }
}

data "aws_iam_role" "postgres" {
  name = "${var.cluster_name}-postgres"
}

resource "kubernetes_service_account" "postgres" {
  metadata {
    name      = "postgres-pod"
    namespace = var.namespace

    annotations = {
      "eks.amazonaws.com/role-arn" = data.aws_iam_role.postgres.arn
    }
  }

  depends_on = [
    kubernetes_namespace.superset
  ]
}
```

[`variables.tf`](https://learn.hashicorp.com/tutorials/terraform/module-create?in=terraform/modules#variables-tf) will contain the variable definitions for your terraform module (the variables are used in `main.tf`

## 4. Add your Plural config

Finally, let's look at how to set up the config that will go to Plural.

From the root of `hasura/`, navigate to `plural/recipes.`

```
plural/recipes
  hasura-aws.yaml
  hasura-azure.yaml
  hasura-gcp.yaml
```

Here, you will specify the other Plural packages that must be installed alongside this package, as well as configuration and documentation for parameters that you will be asking users to input.

```yaml
name: hasura-aws
description: Installs hasura on an EKS cluster
provider: AWS
dependencies: # Other Plural packages that must be installed alongside this bundle
  - repo: bootstrap
    name: aws-k8s
  - repo: ingress-nginx
    name: ingress-nginx-aws
  - repo: postgres
    name: aws-postgres
sections:
  - name: hasura
    items:
      - type: TERRAFORM
        name: aws
      - type: HELM
        name: hasura
    configuration: # Users will be asked to input values for these parameters
      - name: hostname
        documentation: Fully Qualified Domain Name to use for your hasura installation, eg hasura.topleveldomain.com if topleveldomain.com is the domain you inputed for dns_domain above.
        type: DOMAIN
```

## 5. Testing Locally

You can validate your changes locally using the `plural link` command. You'll need to have your packages pushed to plural first, then installed in an installation repo. Once done, you can link your local version of a helm or terraform package using:

```
plural link helm <app-name> --path ../path/to/helm --name <chart-name>
```

## 6. Push your local changes and open a PR

Assuming that you have been working on a branch `add-hasura` you should now commit your changes and open up a PR on Github against the [pluralsh/plural-artifacts](https://github.com/pluralsh/plural-artifacts/) repository.

```
git add .
git commit -m "Integrate hasura changes"
git push
```
