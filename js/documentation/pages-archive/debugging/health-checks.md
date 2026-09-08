---
title: Health Checks
---

Every application has a general application-level health check, which aggregates the statuses of all core kubernetes components and generates a digestable summary for human consumption. These are viewable in the application switcher in the admin console, or by running:

```
plural watch <app-name>
```

This will generate output like:

```
Application: console (0.5.35)  READY
plural admin console

Components Ready: 15/15

Ready Components:
- service/console :: Ready
- service/console-headless :: Ready
- service/console-master :: Ready
- service/console-replica :: Ready
- service/plural-console :: Ready
- service/plural-console-repl :: Ready
...
```

If a component is not ready, it will also generate hints to kubectl commands which might help debug further.
