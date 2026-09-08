---
title: Your Plural Workspace
description: Learn about your Plural Git workspaces and how to manage them.
---

Plural ensures the state of all installed applications are stored in a git repository, under a common format. A typical workspace should have a similar layout to the following example:

```
📦installation-repository
┣ 📜.gitattributes
┣ 📜.gitignore
┣ 📜context.yaml
┗ 📜workspace.yaml
```

---

## Top level files

### context.yaml

When you run `plural bundle install <app-name> <bundle>` and go through the configuration for an application, that information is stored here. In advanced use cases, it can also be manually edited if you want to apply configuration beyond what the bundle provided.

### workspace.yaml

Base cloud provider setup for this repository is stored here. On each app installation, you have the option of inheriting this setup, or reconfiguring for the specific app.

### .gitattributes

This file specifies the filters that drive secret encryption. In general, **do not** manually edit this file.

---

## Application folders

These files exist in every application directory that you install with `plural bundle install <app-name> <bundle>`. To see these files for a
specific application, `cd <APP-NAME>`.

### Helm

`helm/<application_name>`

When installing an application with Plural, the Kubernetes resources are deployed using [Helm](https://helm.sh/). The Plural CLI creates a second Helm chart that wraps the chart(s) downloaded from the Plural API for every application.

The **`values.yaml`** file contains all the configurations specific for this deployment.

The `values.yaml` file is created during the `plural build` command using the user inputs from the `plural bundle install <app-name> <bundle>` command.

### Terraform

`terraform/*`

The cloud resources required for an application installed through Plural are created using Terraform.

The main entrypoint for the Terraform configuration is **`terraform/main.tf`**. Similar to the `values.yaml` file for Helm, the `terraform/main.tf` is created during the `plural build` command for every application you have installed.

### Build and Deploy files

Our build and deploy files are written in HCL, HashiCorp's proprietary configuration language that interacts with Terraform.

`{build | deploy}.hcl`

The build/deploy/diff files manage two things:

- the steps needed to build or apply a specific application in Plural
- change detection between runs

We automatically detect if changes have been made to your Terraform files, which enables us to ignore unneeded Terraform commands that take a long time to execute.

### Miscellaneous Directories and Files

`.pluralignore`

This file tells the Plural CLI to ignore certain paths during change detection, is similar to a `.gitignore` file for Git.

`manifest.yaml`

Metadata about the plural application.

`output.yaml`

Outputs from various tools (Terraform, Helm, etc) that can be imported and used in other applications.

`crds/`

The `crds` directory contains all the CRDs for the Helm chart. We manage these through the Plural CLI rather than Helm so we can do more advanced change detection.

`.plural/`

The `.plural` folder within each application folder container two files: `ONCE` and `NONCE`. These files are used as targets for change detection by the Plural CLI.

The `NONCE` file is used for commands that should be executed a single time after a `plural build` command. The `ONCE` file is used for commands that should only be executed the first time an application is deployed.
