# vSphere cloud connection

Create or choose a vCenter user that can read the inventory you want Workbench to query. A read-only role at the vCenter, datacenter, cluster, or folder scope is usually enough for inventory tables.

Use these values in the connection form:

- **vCenter SDK endpoint:** `https://<vcenter-host>/sdk`
- **User:** a vCenter SSO user such as `administrator@vsphere.local`, or another account with read permissions
- **Password:** the password for that user
- **Allow unverified TLS certificates:** enable this only when vCenter uses an internal or self-signed certificate

You can verify that the SDK endpoint is exposed with:

```bash
curl -k https://<vcenter-host>/sdk/vimServiceVersions.xml
```

The response should be XML listing the supported `urn:vim25` versions.
