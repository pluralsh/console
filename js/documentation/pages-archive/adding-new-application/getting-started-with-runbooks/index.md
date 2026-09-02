---
title: Getting Started With Runbooks
description: What are Plural runbooks? How do I use and create them?
---

Plural Runbooks are meant to be installed alongside your open source applications and serve as interactive tutorials for how to perform common maintenance tasks.&#x20;

{% embed url="https://www.loom.com/share/7fe3874c8a054449bc47cc9ee99f78dd" /%}

Plural comes with a library of runbooks for each application; you are also free to create your own.&#x20;

You can create a runbook just for your own use in your Plural installation, or you can choose to publish the runbook and make it available for other Plural users.

{% tabs %}
{% tab title="Personal Runbooks" %}

1. After you have deployed your application with Plural, go to `my-plural-repo/<app-name>/helm/<app-name>/templates` and create a file called `runbooks.yaml`. For more information about how to write a `runbooks.yaml` please refer to the guide [here](/adding-new-application/getting-started-with-runbooks/runbook-yaml).
2. Go to `my-plural-repo/<app-name>/helm/<app-name>/runbooks` and create an `xml` file for the runbook display. For more information on how to write `xml` for the runbook, please refer to the guide [here](/adding-new-application/getting-started-with-runbooks/runbook-xml).

{% /tab %}

{% tab title="Publishing a Runbook on Plural" %}

1. `git clone git@github.com:pluralsh/plural-artifacts.git`
2. `cd plural-artifacts`
3. Add your configuration to `<app-name>/helm/<app-name>/templates/runbooks.yaml`
4. Add your custom xml template to `<app-name>/helm/<app-name>/runbooks`
5. Open up a PR; once the new runbook has been code reviewed, it will be merged into the repo and available for others to download.

{% /tab %}
{% /tabs %}

You can access the runbooks through the Plural admin console; i.e. you must first [install the Plural admin console](/getting-started/admin-console) in order to use the runbooks.

####
