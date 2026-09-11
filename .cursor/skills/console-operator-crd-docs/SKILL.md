---
name: console-operator-crd-docs
description: Regenerates and synchronizes Console operator CRD documentation. Use whenever editing CRD definitions under go/controller/api.
---

# Console Operator CRD Documentation

After updating Console operator CRD definitions under `go/controller/api`, run both documentation steps.

First, regenerate the CRD reference from `go/controller/`:

```bash
make codegen-crd-docs
```

Then synchronize the generated reference into the documentation site from the repository root:

```bash
make documentation-sync
```

Include changes to both `go/controller/docs/api.md` and `js/documentation/pages/api-reference/kubernetes/management-api-reference.md` with the CRD update.
