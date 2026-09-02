---
title: Tabs
---

## Basic

{% comment %}
https://markdoc.dev/docs/syntax#tags
{% /comment %}

```markdown {% showHeader=false %}
{% tabs %}

{% tab title="Personal Runbooks" %}
Eu qui laborum fugiat ipsum labore proident consequat id dolor exercitation irure ad et qui. Eiusmod anim magna est et eiusmod sit. Esse cillum id pariatur velit laborum. Ex irure amet magna voluptate excepteur exercitation in sit Lorem irure mollit. Incididunt non pariatur velit pariatur fugiat duis velit consequat labore quis dolore.

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
```

{% tabs %}

{% tab title="Personal Runbooks" %}
Eu qui laborum fugiat ipsum labore proident consequat id dolor exercitation irure ad et qui. Eiusmod anim magna est et eiusmod sit. Esse cillum id pariatur velit laborum. Ex irure amet magna voluptate excepteur exercitation in sit Lorem irure mollit. Incididunt non pariatur velit pariatur fugiat duis velit consequat labore quis dolore.

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
