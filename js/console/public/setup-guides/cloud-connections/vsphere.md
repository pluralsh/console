# Set up the vSphere cloud connection

Connect Cloud Query to a vCenter inventory. This integration is read-only: it lists VMs, hosts, datastores, and networks. It does not power VMs on or off, change config, or install agents.

The form needs a **vCenter SDK endpoint**, a **vCenter SSO user**, and that user's **password**.

## Find the SDK endpoint

The SOAP management API shares the vCenter hostname and HTTPS port with the vSphere Client. The difference is the **path**, not the port.

| What | URL |
|---|---|
| vSphere Client (browser UI) | `https://<vcenter-host>/ui` |
| SOAP SDK (this form) | `https://<vcenter-host>/sdk` |
| Automation REST API | `https://<vcenter-host>/api` |

1. Log in to the vSphere Client.
2. Copy the hostname from the browser address bar. Ignore `/ui`, `/vsphere-client`, and any later path.
3. Enter `https://<vcenter-host>/sdk`.

Example: if the client is `https://vcenter.example.com/ui`, the SDK endpoint is `https://vcenter.example.com/sdk`. Default HTTPS port is **443**. Use `https://<vcenter-host>:<port>/sdk` only when vCenter listens on a non-default port.

Do not use:

- `/ui` or `/vsphere-client` (HTML, not SOAP)
- `/api` or `/rest` (vSphere Automation REST, not the VIM SDK this connection uses)
- An ESXi host URL, unless you only have a standalone host. Full inventory (datacenters, clusters, all VMs) requires **vCenter**.

A hostname without a scheme or path (`vcenter.example.com`) also works; the client defaults to `https` and `/sdk`. Prefer the full `https://…/sdk` URL so it is obvious which API you are targeting.

Verify the SDK is reachable:

```bash
curl -k https://<vcenter-host>/sdk/vimServiceVersions.xml
```

The response should be XML listing `urn:vim25` versions, not an HTML login page.

Enable **Allow unverified TLS certificates** only when vCenter uses an internal or self-signed certificate.

## Create credentials

Create a dedicated vCenter identity. Do not use the ESXi `root` user, and do not paste a vSphere Client session cookie.

### Local SSO user (typical)

1. In the vSphere Client, open **Menu → Administration → Single Sign On → Users and Groups**.
2. Select the SSO domain (default `vsphere.local`).
3. **Add User**. Choose a name such as `plural-cloud-query` and set a password.

The form **User** value must include the domain: `plural-cloud-query@vsphere.local`. A bare username without `@vsphere.local` will fail SSO login.

### Active Directory or other identity source

If vCenter is joined to an identity source, create or pick a service account there, then use `user@domain.example` or `DOMAIN\user` as vCenter expects for that source. Still assign vCenter permissions below; directory membership alone does not grant inventory access.

## Grant permissions for the APIs Cloud Query calls

Cloud Query uses the Steampipe vSphere plugin. It authenticates with username/password, then:

1. SOAP `POST https://<vcenter-host>/sdk` (VIM / vim25)
   - `SessionManager.Login`
   - `ViewManager.CreateContainerView` on the vCenter root folder
   - `ContainerView.Retrieve` for `VirtualMachine`, `HostSystem`, `Datastore`, and `Network`
2. Automation REST (VM tags only, table `vsphere_vm`)
   - Session login on the vAPI endpoint
   - `cis/tagging` `GetAttachedTags` and `GetCategory`

It does not call guest operations, power APIs, or write APIs.

### Inventory (required)

Use the built-in **Read-only** role. That role is exactly the system privileges needed to log in and read object properties:

- `System.Anonymous`
- `System.View`
- `System.Read`

Assign it so the user can see the objects you want queried:

1. **Menu → Administration → Access Control → Global Permissions → Add**, or right-click the vCenter object (or a datacenter, cluster, or folder) → **Add Permission**.
2. Select the SSO user.
3. Role: **Read-only**.
4. Enable **Propagate to children**.

Without propagate, ContainerView returns nothing below the object you assigned. Scope the permission to a folder or cluster if the connection should not see the whole inventory.

Do not grant Administrator, Virtual machine **Power user**, or other write roles.

### Tags (needed for `vsphere_vm.tags`)

vSphere tags are global objects, not children of a VM. Inventory Read-only on a VM does not include tag reads.

Assign **Read-only** as a **Global Permission** (with propagate) so the user can call tagging REST. If tagging REST fails, VM inventory queries can fail entirely because tag lookup runs as part of listing VMs.

You do not need **vSphere Tagging → Create / Edit / Delete** or **Assign or Unassign vSphere Tag**.

## Complete the configuration

- **vCenter SDK endpoint:** `https://<vcenter-host>/sdk`
- **User:** SSO principal, for example `plural-cloud-query@vsphere.local`
- **Password:** that user's password
- **Allow unverified TLS certificates:** only for internal or self-signed vCenter certs
