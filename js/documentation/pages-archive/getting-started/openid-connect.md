---
title: OpenID Connect
description: What is OIDC and how do you set it up?
---

When you run `plural bundle install` to install an application, you may be asked about whether or not you want to enable Plural OIDC for that application.

## What is OpenID Connect?

OpenID Connect is a form of [SSO](https://www.onelogin.com/learn/how-single-sign-on-works) that enables Plural users to add an authentication layer on top of any apps they deploy with Plural. Instead of using the application's normal login screen,
you are instead prompted to login with Plural. This login is connected to your login at [app.plural.sh](https://app.plural.sh). For example, if you have enabled OIDC, if you are logged in and try to access `airbyte.$YOUR_WORKSPACE.onplural.sh`, this pops up:

![](/assets/setup-oidc/image-1.png)

If you aren't logged in, you'll see this screen when you navigate to your application:

![](/assets/setup-oidc/image-2.png)

All Plural applications have the capability to create a custom OIDC provider for a user's installation. This allows Plural to become a unified identity management solution for your entire open source portfolio. We have even automated upgrades for OIDC configuration changes, so the setup process is entirely turnkey.&#x20;

## Login Policies

The provider is mapped to a set of users+groups, just like a Plural role, and if that login policy does not pass, you cannot complete the OIDC login and consent flow. Plural ID tokens will include core user information along with the plural groups they belong to, allowing for seamless identity mapping onto the applications governed by Plural.

## Supported Applications

**Applications that currently support Plural OIDC are:**

- [Plural Console](https://www.plural.sh/applications/console) - includes group provisioning as well
- [Airflow](https://www.plural.sh/applications/airflow)
- [Airbyte](https://www.plural.sh/applications/airbyte)
- [Sentry](https://www.plural.sh/applications/sentry)
- [GitLab](https://www.plural.sh/applications/gitlab)
- [Grafana](https://www.plural.sh/applications/grafana)
- [Argo CD](https://www.plural.sh/applications/argo-cd)
