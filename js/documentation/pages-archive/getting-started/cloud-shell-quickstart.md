---
title: In-Browser Quickstart
description: Setting up your first cluster in your browser using the Plural Cloud Shell.
---

## Overview

This guide goes over how to get started with Plural using our in-browser Cloud Shell. At the end of this tutorial, you will have:

- Provisioned a virtual shell loaded with the dependencies to run Plural.
- Created a Plural GitHub repository to store your configuration in.
- Provisioned a fully-configured Kubernetes cluster.
- Installed an application and all its dependencies on your Kubernetes cluster.

in under 30 minutes, all within your browser. You can see the process in the video here or follow the instructions step-by-step, esp for unique cloud providers:

{% embed url="https://www.youtube.com/watch?v=mFDA-718RhI&ab_channel=Plural" aspectRatio="16 / 9" /%}

## Login and Create the Plural Repository

Once you're logged in, you'll land on the Clusters Overview page. You can click on the "Start onboarding" button to kick off your onboarding process in your shell [app.plural.sh/shell](https://app.plural.sh/shell).

### Set up a Cloud Provider

Choose either the option to set up Plural using your own cloud credentials, or try our free 6-hour GCP sandbox demo. If you use your own cloud credentials, choose our Cloud Shell setup option. If you'd prefer to use the CLI, choose "Local terminal" and switch to the CLI quickstart.

![](/assets/cloud-shell-quickstart/setup-options.png)

You'll then be prompted to OAuth with either GitHub or GitLab. We're just getting your permission to create a repository for Plural configuration on your behalf. Give your repository a name, being sure to select the right organization or individual account in the first box. Your repository name must be unique within your account, which will be checked before you can advance to the next step.

![](/assets/cloud-shell-quickstart/github-config.png)

Plural can be set up on AWS, GCP, or Azure. You can provide your credentials in the following screen:

![](/assets/cloud-shell-quickstart/cloud-provider-info.png)

Each cloud provider requires a slightly different set of credentials. Follow the steps below to generate the credentials for your provider.

{% tabs %}
{% tab title="AWS" %}
For AWS, you'll need to create or use a user with AdministratorAccess and create an access key for Plural to use.

To create a new user, navigate to the IAM section of your AWS Console.

![](/assets/cloud-shell-quickstart/iam-aws.png)

Select the `Users` tab and click `Add users`. You should see the following screen:

![](/assets/cloud-shell-quickstart/create-user.png)

Fill in the details for your user. On the "Set permissions" screen, you can either choose to add your user to a group with AdministratorAccess, or attach the AdministratorAccess policy directly.

![](/assets/cloud-shell-quickstart/administrator-access-aws.png)

Review your user and hit the "Create user" button. Navigate to your newly created user and click the "Security credentials" tab. Find the section for Access keys and click "Create access key". You should see the following:

![](/assets/cloud-shell-quickstart/access-keys-aws.png)

Choose "Command Line Interface", optionally add a tag, and create your access key. Make sure to download and save your new credentials; you can then enter the Access Key ID and Secret Access Key in your Plural onboarding.

![](/assets/cloud-shell-quickstart/aws-plural-config.png)

{% /tab %}

{% tab title="GCP" %}
For GCP, you'll want to create a service account with the Owner role and generate an access key for Plural to use.

To create a new service account, navigate to the "Service Accounts" section of your GCP Console.

![](/assets/cloud-shell-quickstart/service-accounts-gcp.png)

Select the "Create Service Account" from the top banner. You should see the following input fields:

![](/assets/cloud-shell-quickstart/gcp-service-account-fields.png)

Fill in the details for your user. On the second step, add the `Owner` role for your service account.

![](/assets/cloud-shell-quickstart/gcp-owner-service-account.png)

Finish creating your service account, and you should see your new service account in the Service Accounts home page. Click the three dots at the end of the row and select "Manage keys" like in the screenshot below:

![](/assets/cloud-shell-quickstart/create-keys-gcp.png)

Select "Add Key" and save the generated file. This will be used to configure your GCP credentials in your Plural onboarding.

![](/assets/cloud-shell-quickstart/gcp-plural-config.png)

{% /tab %}

{% tab title="Azure" %}

You can either follow along with the text instructions here or use the following video to set up your Azure installation on Plural.

{% embed url="https://www.youtube.com/watch?v=LgwnBjYOCbg&t=10s&ab_channel=Plural" aspectRatio="16 / 9" /%}

For Azure, you'll need various fields including your Client ID, Client Secret, Subscription ID, Tenant ID, Resource Group, and Storage Account.

To find your Subscription ID, navigate to the home page of your Azure console and search for "Subscriptions". You should see a page like the following:

![](/assets/cloud-shell-quickstart/subscriptions-azure.png)

Your `Subscription ID` should be visible next to the Subscription name.

Next, navigate to the Azure Active Directory section. Your `Tenant ID` should be displayed under "Basic information".

Finally, navigate to the App registrations tab within your Directory. You should see an option to add a new registration:

![](/assets/cloud-shell-quickstart/app-registrations-azure.png)

Click to add a new registration. Fill in the details for your registration as indicated below and click the "Register" button.

![](/assets/cloud-shell-quickstart/registration-details-azure.png)

Your new App Registration should then be displayed. The displayed "Application (client) ID" will be the `Client ID` in your Plural configuration. Click on the option "Add a certificate or secret" of Client credentials. Select "New client secret" from the screen:

![](/assets/cloud-shell-quickstart/new-client-secret-azure.png)

Set your preferred timeframe and generate your new secret. The "Value" field will be the `Client Secret` in your Plural configuration.

You can optionally navigate to the Resource groups section of your Azure console to retrieve a `Resource Group` and `Storage Account`, or you can enter new values in the Plural configuration which can create them for you.

From here, you have two options. You either need to give your app a role on either your overall Subscription or scoped to a Resource Group. As an example, navigate to the Access Control (IAM) tab of your Subscription. Click the "Role Assignments" tab and Select "Add" at the top.

![](/assets/cloud-shell-quickstart/ra-azure.png)

Select the Owner role, and click on "Select members" to search for your app name. Select the app and continue until your new Role assignment is complete. You should now see your app listed as an owner for the Subscription. The process is the same if choosing to scope to a Resource Group.

![](/assets/cloud-shell-quickstart/completed-role-assignments-azure.png)

Return to your Plural onboarding. Enter the values noted above into your Cloud Credential configuration, and proceed to the next step.

![](/assets/cloud-shell-quickstart/azure-plural-config.png)
{% /tab %}
{% /tabs %}

### Set up a Workspace

We'll now start setting up your Kubernetes cluster configuration. Here's a guide to the config:

**cluster**: The name of your Kubernetes cluster. Name this based on what you're planning to run.

**bucket prefix**: We provision S3 buckets for storing logs and state. Enter any string to help us uniquely name your buckets.

**subdomain**: We'll provision a subdomain for you to host your cluster and applications under. For example, if you choose `nintendo` as your subdomain and spin up an instance of Airflow, it will be available at `airflow.nintendo.onplural.sh`.

You should hit the following verification screen afterward. Hit `Create` once you're ready to go!

![](/assets/cloud-shell-quickstart/cloud-shell-config.png)

While your Cloud Shell is provisioning, double check that your repository was initialized by checking your GitHub repos. There should be a repository with an initial commit with the name that you configured.

## Install Wizard and Cloud Shell

You'll be redirected into your Cloud Shell environment after confirmation. Your Cloud Shell is where you can install applications, inspect your workspace, and run terminal commands.

The left-hand side of the screen is the Install Wizard, where you can configure applications for installation. Applications can be configured and installed in a fully point-and-click manner by following the available prompts. When Plural is installing your applications, you can follow progress on the right-hand side of the screen in the terminal window.

The terminal window is an interactive shell where you can follow along with installation progress and optionally run any additional commands you need to set up your Plural instance.

![](/assets/cloud-shell-quickstart/cloud-shell-applications.png)

### Select Applications

Once you have successfully booted into your Cloud Shell, you can configure and install applications.

In the Install Wizard on the left-hand side of the screen, choose the applications you want to install on your cluster. This will add these applications and their dependencies to the configuration flow, shown at the top of the Install Wizard.

![](/assets/cloud-shell-quickstart/cloud-shell-applications.png)

You'll now be guided through a setup wizard for the applications you chose. For help with Plural Console configuration, refer to [this guide](/applications/console) for explanations on each step. For help with configuring Airflow, refer to [this guide](/applications/airflow). Required fields are indicated with a star and will appear in red until they've been populated. Many fields have default values populated; you can use those defaults or provide your own inputs. Any steps without required configuration will be auto-skipped.

![](/assets/cloud-shell-quickstart/airbyte-configuration.png)

After configuration, you'll be provided with an overview screen of exactly which applications will be installed. When you're happy with the configuration, click `Install` to proceed.

![](/assets/cloud-shell-quickstart/applications-install-confirm.png)

## Provision the Kubernetes Cluster and Install Applications

Now it's time for Plural to write all the Helm and Terraform required to bring up your Kubernetes cluster based on the config that you've entered. When you click install, Plural will be running the commands to `build` and `deploy` your cluster. Your terminal window will display the output from these ongoing operations.

![](/assets/cloud-shell-quickstart/terminal-output.png)

Now grab a coffee or your favorite hot beverage while we wait for your cloud provider to provision your infrastructure.

When your applications are finished installing, you'll be able to see the domains for each application in the terminal window, and you can launch them once all components are ready.

![](/assets/cloud-shell-quickstart/application-domains.png)

### Troubleshooting

Occasionally errors can crop up during the build and deploy process. If your build or deploy fails, you can try re-running the commands to see if it resolves an intermittent issue. To do this, click into the terminal window and either tap the up arrow key to see the last command or type in `plural build && plural deploy --commit "deploying a few apps with plural"` to relaunch the process from where it left off and commit your changes when finished.

If errors persist, check out our [Troubleshooting documentation](/debugging/common-errors) or [reach out to us on our community Discord](https://discord.com/invite/bEBAMXV64s) for help.

## Check out your Deployments

### Plural Console

Once your cluster has completed deployment, click the `Launch Console` button to head over to `console.YOUR_WORKSPACE.onplural.sh` (or the hostname you picked) and view the console that you have provisioned. If you enabled Plural OIDC, you'll be able to quickly login using your Plural account.

Here, you'll be able to check node health, Pod health, logs, pre-built dashboards tailored for Airflow, and more.

![](/assets/cloud-shell-quickstart/console-example.png)

### Airflow / Other Applications

To access your Airflow installation, access it similarly to the console at `airflow.YOUR_WORKSPACE.onplural.sh`

![](/assets/cloud-shell-quickstart/image-7.png)

You can now access your DAGs from the GitHub repo that you set up earlier. Just add any DAGs you want to use the repo and a sync will run every 5 minutes or so to pull them in.

Accessing other applications deployed on Plural will work exactly the same way.

## Wrapping Up

Now that we've set up a running cluster with Plural, we can add and remove applications to our existing cluster as we so choose.

### Uninstalling Applications

To uninstall an application from your cluster, run the following in your Cloud Shell:

```shell {% showHeader=false %}
plural destroy <app-name>
```

### Deleting your Cluster and Resetting the Cloud Shell

To fully delete your Plural Cluster, run the following in your Cloud Shell:

```shell {% showHeader=false %}
plural destroy
```

This will tear down your Plural Cluster and all attached installations.

To also delete the Cloud Shell itself (e.g., to change Cloud Providers or restart onboarding), click the three dots on the upper-right side of the Cloud Shell and select `Delete cloud shell`. This will bring up a confirmation prompt; enter "delete" to wipe your shell and restart onboarding from the beginning.

### Leaving the Shell Experience

If you want to start using the CLI locally, just {% doclink to="quickstart" %}install the Plural CLI{% /doclink %} and run:

```shell {% showHeader=false %}
plural shell sync
```

This will sync your local installation with the Cloud Shell. You can then proceed to purge the shell if you wish to spin it down:

```shell {% showHeader=false %}
plural shell purge
```

### Feedback

If you have any feedback or questions about the experience, [head over to our community Discord](https://discord.com/invite/bEBAMXV64s) and drop us some feedback. The Cloud Shell is still in development and we are dedicated to perfecting the user experience, so any feedback would be immensely helpful to us.
