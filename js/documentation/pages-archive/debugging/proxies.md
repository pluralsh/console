---
title: Proxies
---

Plural also helps with discovering useful proxy commands for inspecting core resources. This is done via the `Proxy` crd. A decent example is the proxy to the admin consoles underlying Postgres database:

```yaml
apiVersion: platform.plural.sh/v1alpha1
kind: Proxy
metadata:
  name: db
  labels:
spec:
  type: db
  target: statefulset/console-postgresql
  credentials:
    secret: console-postgresql
    key: postgresql-password
    user: console
  dbConfig:
    name: console
    engine: postgres
    port: 5432
```

The interface is quite powerful, and supports things like fetching db credentials and initiating a sql shell, or spawning a web ui via `kubectl port-forward` and printing the credentials to stdout to allow a user easily log in.
