---
title: OIDC Integration with Plural
description: Centralize Kubernetes authentication across clusters with Plural’s OIDC connector
---

Plural integrates with any [OpenID Connect (OIDC)](https://openid.net/)-compliant identity provider to centralize authentication and authorization across your Kubernetes clusters.  
Instead of managing users and roles cluster-by-cluster, you connect Plural once to your enterprise IdP (Okta, Azure AD, Google Identity, etc.) and enforce consistent RBAC policies everywhere.

## Why Centralized Authentication Matters

Kubernetes does not manage users internally—it delegates identity to external systems. Without centralized identity, every cluster becomes a silo with its own credentials, RBAC mappings, and policies. This creates problems:

- **Inconsistent policies:** Users often have mismatched access across clusters.  
- **Security gaps:** Stale or orphaned accounts remain long after people leave.  
- **Operational overhead:** Every new cluster requires duplicating RBAC policies.  
- **Compliance challenges:** Auditing access across many clusters becomes painful.  

By integrating with an IdP via OIDC, Plural eliminates these challenges.

## Benefits of Plural’s OIDC Connector

- **Centralized identity:** Connect once to any OIDC provider.  
- **Multi-cluster consistency:** Apply the same authentication rules across your fleet.  
- **Group-based RBAC:** Map identity provider groups to Kubernetes roles.  
- **GitOps-friendly:** Manage OIDC config declaratively in version control.  

## Supported Identity Providers

Plural supports any OIDC-compliant identity provider (IdP) for enterprise use. This means it can integrate with common enterprise options as long as they adhere to the OpenID Connect standard.

> For Okta, see the full [step-by-step guide](okta.md).