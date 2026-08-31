---
title: Okta
description: Centralizing Kubernetes Authentication with Okta and Plural
---

## What You'll Get

Plural's OIDC integration with Okta provides:

* Centralized authentication for all Kubernetes clusters managed by Plural
* Group-based access control that maps Okta groups to Kubernetes RBAC roles
* GitOps-friendly configuration for consistent, auditable identity management
* Automated onboarding and offboarding by updating group membership in Okta
* Full auditability via Okta login logs and Kubernetes audit logs

Once configured, your Plural Console login page will include **Log in with OIDC**, and group membership in Okta will directly control cluster access.

## Prerequisites

- An Okta admin account (trial: [Okta Free Trial](https://www.okta.com/free-trial/))  
- A Plural-managed Kubernetes cluster  
- Basic knowledge of [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)  

## Step 1: Register an OIDC Application in Okta[text](../../../public/assets/oidc-integration)

1. Log into **Okta Admin Console** → **Applications → Create App Integration**.  
2. Select **OIDC** and **Web Application**.

![](/assets/oidc-integration/okta-new-app.png)

3. Configure redirect URIs for your Plural console domain.  
4. Save and copy:
   - **Client ID**  
   - **Client Secret**  
   - **Issuer URL** (e.g., `https://<org>.okta.com`)  

![](/assets/oidc-integration/okta-credentials.png)

## Step 2: Configure Plural to Use Okta

1. In [Plural Console](https://app.plural.sh), open your management cluster.  
2. Under **Login Settings**, enable **External OIDC**.  
3. Enter the Okta **Issuer URL**, **Client ID**, and **Client Secret**.  
4. Save changes.

![](/assets/oidc-integration/external-oidc.png)

Plural now delegates login to Okta. You should see a **Log in with OIDC** button.

## Step 3: Map Okta Groups to Kubernetes RBAC

1. In Okta Admin Console, create groups (e.g., `sre`, `developer`).  
2. Assign users to groups.  
3. Bind groups to RBAC roles in Kubernetes via GitOps:

```yaml
# sre group → cluster-admin
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sre-binding
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: Group
  name: sre
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# developer group → view (read-only)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developer-binding
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: Group
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

Plural's GitOps pipeline syncs these bindings to all managed clusters automatically.

## Verifying Access

After configuring Okta integration, you should confirm that group-to-RBAC mappings are working correctly. The simplest way to validate RBAC is with `kubectl auth can-i`. This command lets you impersonate a group and test whether specific actions are allowed.

```bash
# SRE group should have full admin rights
kubectl auth can-i create pods --as-group=sre

# Developer group should only have read-only permissions
kubectl auth can-i delete pods --as-group=developer
```

Expected results:
- The first command should return yes (SREs are bound to cluster-admin).
- The second should return no (Developers only have view role).