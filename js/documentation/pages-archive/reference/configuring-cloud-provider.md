---
title: Cloud Provider CLI Setup
description: >-
  Make sure that your cloud provider CLI is properly set up before installing
  Plural.
---

Before you can start installing your Kubernetes cluster and applications with the Plural CLI, you will need to make sure that your cloud provider CLI is set up correctly.

{% callout severity="info" %}
If you have already configured and installed your cloud provider CLI and are still seeing errors, make sure that you are on the latest version of the CLI.
{% /callout %}

## Installation

Follow the provider-specific instructions below.

{% tabs %}
{% tab title="AWS" %}

- Follow the instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) to install your AWS cli.
- Verify that the cli has been added to your `$PATH`
- Follow the instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) to configure your cli and connect it to your aws console
- Verify that your cli has been properly configured by running

```
aws configure list
```

You should see a set of values that looks like this:

```
      Name                    Value             Type    Location
      ----                    -----             ----    --------
   profile                <not set>             None    None
access_key     ****************RUG2 shared-credentials-file
secret_key     ****************hJUU shared-credentials-file
    region                us-east-2      config-file    ~/.aws/config
```

If you are deploying to an AWS account with SSO enabled, you'll need to pass that specific AWS profile to the Plural CLI, or it won't be able to create resources on your behalf. You can do this with the following two steps:

1. Run `export AWS_PROFILE=profile_name` to set this variable for your terminal session.
2. Run `aws sso login` to open your relevant SSO auth page and log in.

If you need to update your AWS CLI for any reason, make sure to run `plural wkspace kube-init` to regenerate your kubeconfig to be compatible with the changes. This will be required if you're on a new machine, were using a different Kubernetes cluster, or if the kubeconfig has stale credentials.

{% /tab %}

{% tab title="GCP" %}

- Follow the instructions [here](https://cloud.google.com/sdk/docs/install) to install the gcloud CLI.
- Verify that the CLI has been added to your `$PATH`
- Create a new project in gcp via the CLI:

```
gcloud projects create example-project-name
```

- [Enable the Kubernetes Engine API](https://cloud.google.com/kubernetes-engine/docs/quickstart) for the project you just created.
- [Enable the Google DNS API](https://excelnotes.com/enable-cloud-dns-api/) for the project you just created.
- Run `gcloud init` and follow the prompts to configure the gcloud CLI and connect it to the project you just created.
- Verify that your CLI has been properly configured. It should look something like this. Make sure that your active configuration is set to the project you just created.

```
> gcloud config list
[compute]
region = us-east1
zone = us-east1-b
[core]
account = yirenlu92@gmail.com
disable_usage_reporting = True
project = example-project-name

Your active configuration is: [example-project-name]
```

- It can be the case that you have multiple accounts or projects in GCP and previously have configured your gcloud CLI to point to a different project. Verify your active configuration with

```
> gcloud config configurations list
NAME                  IS_ACTIVE  ACCOUNT              PROJECT               COMPUTE_DEFAULT_ZONE  COMPUTE_DEFAULT_REGION
personalprj           False      yirenlu92@gmail.com  personalprj           us-east1-b            us-east1
example-project-name  True       yirenlu92@gmail.com  example-project-name  us-east1-b            us-east1
```

- To change the active configuration run

```
> gcloud config configurations activate example-project-name
Activated [example-project-name].
```

- To refresh the login for this gcloud configuration run

```
> gcloud auth login
```

- In addition to the gcloud CLI, the Plural CLI, as well as the employed GCP Terraform providers, also use the gcloud SDK. So you will also need to setup [Application Default Credentials](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login). Make sure to use the same account as you used to authenticate your active gcloud CLI configuration!

```
> gcloud auth application-default login
```

Failure to do this could result in `project requested not found` or permission related errors further along.

{% /tab %}

{% tab title="Azure" %}

- Follow the instructions [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to install your Azure CLI.
- Follow the instructions [here](https://docs.microsoft.com/en-us/cli/azure/get-started-with-azure-cli) to sign into your Azure CLI.
- Install `aks-preview` extension for your Azure CLI:

```
az extension update -n aks-preview --allow-preview true
```

{% callout severity="warning" %}
Keep in mind that your Azure subscription type can limit the availability of your VMs, so make sure to tailor your subscription
to the availability requirements of your infrastructure.
{% /callout %}

{% /tab %}
{% /tabs %}

## Permissions

Since Plural is responsible for creating over 50 different applications, what permissions are required will vary based on what you're deploying. In most cases, `Admin` access is the simplest to use. For example, when provisioning Airbyte, we'll need to create an IAM role and IRSA binding to the EKS control plane, which is an `Admin` only action.

{% tabs %}
{% tab title="GCP" %}

#### **Service Account Permissions**

When deploying via GCP, you may run into a Terraform error around permissions. Plural will need to create a various set of resources in order to make sure that your Kubernetes cluster is configured correctly. We recommend attaching the following permission roles to the service account associated with your CLI or Cloud Shell:

- `owner`
- `storage.admin`

You can fix this with the following CLI commands updating `PROJECT_ID` with your GCP Project ID and `USER_EMAIL` with your GCP service account ID
```
> gcloud projects add-iam-policy-binding PROJECT_ID \
    --member=user:USER_EMAIL \
    --role=roles/owner
```

```
> gcloud projects add-iam-policy-binding PROJECT_ID \
    --member=user:USER_EMAIL \
    --role=roles/storage.admin
```

Follow [these steps](https://cloud.google.com/sdk/docs/authorizing#authorize_with_a_service_account) to authorize your GCloud CLI with a new or existing Service Account.
{% /tab %}

{% tab title="AWS" %}
No special permissions necessary, but as mentioned above, providing Plural `Administrator` access will prevent issues around application specific requirements.
{% /tab %}

{% tab title="Azure" %}
No special permissions necessary, but as mentioned above, providing Plural `Administrator` access will prevent issues around application specific requirements. Make sure you're specifically providing `Administrator` access for the resource group you're deploying Plural into.
{% /tab %}
{% /tabs %}
