---
title: Update an Application
description: How to change an application's version.
---

Updates to Plural applications are applied **automatically** based on a per-application setting. This setting supports telling Plural to only upgrade for Stable or Warm releases, as well as disabling automatic upgrades altogether. Here's what each of the settings mean:

- **Latest**: Everytime the Plural team tests and publishes a new release, you receive it.
- **Stable**: You only receive versions that have passed a set of Plural determined tests.
- **None**: You never receive automatic updates and have to manually update your application versions or change this setting.

You can change this setting in the App settings menu, accessible from each cluster's details page. You can dive into each cluster from the Clusters Overview page [https://app.plural.sh/overview/clusters](https://app.plural.sh/overview/clusters).

![](/assets/operations/update-application.png)

## Rollback to a previous version

This requires having the [Plural Console installed](/getting-started/admin-console). We'll need this to create an upgrade
policy that tells Plural to not deploy an upgrade to your application, which is normally performed automatically unless disabled using the setting in our app. You could just disable upgrades altogether in
the application as stated above, but then you'd lose out on easy upgrade delivery later.

First, navigate to the Plural Console and select the Builds tab.

Click on the gear icon in the top right to enter the Upgrade Policy section and then click `Create More`.

Here is an example for a policy that will require approval before runninng `plural deploy` for Airflow.

![](/assets/operations/airflow-approval-policy.png)

Then head back to our [marketplace](https://app.plural.sh/marketplace), go to the repository page for your installed application, and click the `Packages` section in the sidebar. This will allow you
to pick Helm charts and Terraform modules that correspond to previously deployed versions of your application.

Once you click on the Helm chart, the associated application version for the Helm chart is displayed in the `CHART.YAML` section on the right. On the left will be a drop-down menu showing which version you are currently on. Scroll through the
chart versions to find the application version that you want to rollback to. Then click `Install` in the top right.

_We'll be honest. This process isn't ideal, so we're working on a simple rollback command in our CLI._

## How Plural updates app versions

We use a tool called [Renovate](https://github.com/renovatebot/renovate) to automate the updating of application version images. Renovate creates pull requests against our plural-artifacts GitHub repository to perform these updates on a regular basis. [Here](https://github.com/pluralsh/plural-artifacts/pull/236) is an example of one of those PRs.

Once we have tried out the changes and have confirmed that the new version is stable, we will merge the PR and the change will be available for all Plural installations to pull down when they wish to.

Occasionally, we do manually update these versions to pull in application changes more quickly. If a current version is breaking user workflows or if a new version of an application is heavily requested, we will manually perform this operation.
