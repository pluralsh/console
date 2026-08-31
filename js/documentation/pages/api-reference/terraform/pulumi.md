---
title: Using from Pulumi
description: >-
  Use the Plural Terraform provider from Pulumi via the Any Terraform Provider bridge
---

Pulumi can consume the same [`pluralsh/plural`](https://registry.terraform.io/providers/pluralsh/plural) Terraform provider through the [Any Terraform Provider](https://www.pulumi.com/docs/iac/concepts/providers/any-terraform-provider/) bridge. There is no separate package on PyPI or npm — the SDK is generated locally in your project.

```bash
pulumi new python   # or typescript, go, etc.
pulumi package add terraform-provider pluralsh/plural <version>
pulumi install
```

Pin `<version>` for reproducible builds (recommended), or omit it to use the latest registry release.

Credentials (either):

* `plural cd login`, then `use_cli=True` / `PLURAL_USE_CLI=true`
* `PLURAL_CONSOLE_URL` + `PLURAL_ACCESS_TOKEN`

Optional kubeconfig at `~/.kube/config` for agent install. See also [Configuring the Provider](/api-reference/terraform#configuring-the-provider).

```bash
pulumi preview
pulumi up
```

## Example

Python equivalent of a Terraform `plural_cluster`:

```python
import pulumi
import pulumi_plural as plural

provider = plural.Provider("plural", use_cli=True)
opts = pulumi.ResourceOptions(provider=provider)

default_project = plural.get_project(
    name="default",
    opts=pulumi.InvokeOptions(provider=provider),
)

cluster = plural.Cluster(
    "test",
    name="test-cluster",
    handle="test",
    project_id=default_project.id,
    opts=opts,
)

pulumi.export("cluster_id", cluster.id)
```

| Terraform | Pulumi Python |
| --- | --- |
| `provider "plural"` | `plural.Provider(...)` |
| `plural_cluster` | `plural.Cluster` |
| `data.plural_project` | `plural.get_project(...)` |
| `use_cli` | `use_cli` |
| `kubeconfig.config_path` | `ProviderKubeconfigArgs(config_path=...)` |

See [pluralsh/pulumi-plural](https://github.com/pluralsh/pulumi-plural) for a fuller example.

{% callout severity="info" %}
To run Pulumi programs through Plural Stacks, create an `InfrastructureStack` with `type: PULUMI` (see [Pulumi stacks](/plural-features/stacks-iac-management/pulumi)).
{% /callout %}
