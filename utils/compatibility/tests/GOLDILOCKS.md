# Goldilocks compatibility source notes

Goldilocks publishes its Helm chart in the Fairwinds stable repository:

- chart source: https://github.com/FairwindsOps/charts/tree/master/stable/goldilocks
- Helm repository: https://charts.fairwinds.com/stable
- application source: https://github.com/FairwindsOps/goldilocks

The scraper intentionally records only stable chart entries that publish an explicit `kubeVersion` constraint. It interprets Fairwinds' `>= 1.x.0-0` value as the chart's Helm installation floor and expands that floor only through this repository's `KUBE_VERSION`. It does **not** claim that every expanded Kubernetes minor is independently runtime-certified by Fairwinds.

Older Goldilocks chart history without a `kubeVersion` field is left out rather than assigning a support range from current documentation or later chart metadata.

Current provenance checked for the initial catalog:

- Goldilocks app `4.16.1`: current chart `11.1.0`, `kubeVersion: ">= 1.22.0-0"`.
- Goldilocks app `4.14.1`: chart `10.6.0`, `kubeVersion: ">= 1.22.0-0"` (Fairwinds chart history before the 4.16.1 image bump).
- Goldilocks app `4.13.0`: chart `9.0.1`, `kubeVersion: ">= 1.22.0-0"`.

The chart README also documents Goldilocks' VPA requirement. The VPA subchart is optional in values and its exact chart dependency changes independently, so no fixed Plural `requirements` version is invented in the compatibility rows.

Focused validation:

```sh
python -m pytest utils/compatibility/tests/test_goldilocks.py -q
```
