---
title: API Tokens
---

In addition to the temporary JWTs the API issues on login, it's possible to create persistent access tokens to access the API. This is also the common way credentials are managed when using the plural CLI, with the `plural login` command either creating or fetching a recent access token to use for all API calls.

### Creating a Token

You can create a token manually using the web interface here: [https://app.plural.sh/me/edit/tokens](https://app.plural.sh/me/edit/tokens) or you can simply run:

```
plural login
plural config read
```

to grab the token configured at login.

### Token Security

Plural captures access logs for all token usage, including IP information, available by inspecting the token in the [access tokens page](https://app.plural.sh/me/edit/tokens). You are also free to revoke a token at any time, although this might require you to rotate the keys used by your plural installations manually, so it's recommended to check the logs for that token before doing so to understand your exposure

{% callout severity="info" %}
Revoking a token while an instance of the plural console is using it will prevent it from receiving upgrades, but once the token is rotated, it will pick back up and apply the upgrades as normal.
{% /callout %}
