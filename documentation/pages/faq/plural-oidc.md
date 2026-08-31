---
title: Does Plural support OpenID Connect?
---

All Plural applications have the capability to create a custom OIDC provider for a user's installation. This allows Plural to become a unified identity management solution for your entire open source portfolio. We have even automated upgrades for OIDC configuration changes, so the setup process is entirely turnkey.&#x20;

### Login Policies

The provider is mapped to a set of users+groups, just like a Plural role, and if that login policy does not pass, you cannot complete the OIDC login and consent flow. Plural ID tokens will include core user information along with the plural groups they belong to, allowing for seamless identity mapping onto the applications governed by Plural.
