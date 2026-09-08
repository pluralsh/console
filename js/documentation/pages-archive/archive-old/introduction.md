---
title: Introduction
---

Plural comes pre-built with a lot of the core concepts needed for IAM at any organizational scale. These include:

- Users and Groups - maintain a full directory to manage identity within Plural
- Roles - which can be bound to any set of users or groups of users to allocate permissions
- Service Accounts - dedicated identities with a fixed policy as far as what other entities can impersonate them and act on their behalf.

### Account Basics

When you sign up to plural, you'll immediately be allocated an account. You can then invite users by using the form at [https://app.plural.sh/accounts/edit/users](https://app.plural.sh/accounts/edit/users). Users who sign up organically will get their own accounts, and will have to be linked afterwards, so we recommend onboarding additional users via invite.

{% callout severity="info" %}
The only users eligible for sharing repo encryption keys are also those users in your account .
{% /callout %}

### RBAC Basics

Each Plural role is configurable using the role creation form at [https://app.plural.sh/accounts/edit/roles](https://app.plural.sh/accounts/edit/roles):

![](/assets/advanced-topics/rbac-basics.png)

The permissions are fairly self explanatory, but you do have the ability to map a role to whatever identity grouping you'd want to use, and filter the roles application to a list of repositories (or a regex on repository name). The latter mode is helpful if you'd like a certain role to only be able to install, say, airflow and sentry.
