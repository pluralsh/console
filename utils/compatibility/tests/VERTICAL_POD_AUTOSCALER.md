# Vertical Pod Autoscaler compatibility source notes

The scraper uses only first-party Kubernetes Autoscaler sources.

## Compatibility source

The authoritative VPA installation documentation publishes a maintained-release compatibility table:

- VPA `1.7.x` supports Kubernetes `1.35` through `1.37`.
- VPA `1.6.x` supports Kubernetes `1.34` through `1.36`.
- VPA `1.5.x` supports Kubernetes `1.33` through `1.35`.

Source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md#compatibility

The scraper parses only the bounded `## Compatibility` section and fails closed when a documented row or range is malformed.

## Helm source

The Kubernetes Autoscaler project publishes and supports the VPA Helm chart at:

- repository: `https://kubernetes.github.io/autoscaler`
- chart: `vertical-pod-autoscaler`

The repository index supplies chart `appVersion` metadata. For each maintained VPA minor, the scraper selects the newest stable application patch that has a stable published chart. At the time this contribution was prepared, those mappings were:

- VPA `1.7.1` -> chart `0.12.0`
- VPA `1.6.0` -> chart `0.9.0`
- VPA `1.5.1` -> chart `0.8.0`

The scraper deliberately does not infer support for VPA release minors absent from the official compatibility table.

## Focused validation

From `utils/compatibility`:

```sh
python -m pytest tests/test_vertical_pod_autoscaler.py -q
```

A full live compatibility generation additionally requires Helm because the shared updater renders chart images.
