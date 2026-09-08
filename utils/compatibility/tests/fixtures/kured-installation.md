---
title: Installation
weight: 1
---

## Default installation with manifests

To obtain a default installation without Prometheus alerting interlock
or Slack notifications:

```console
latest=$(curl -s https://api.github.com/repos/kubereboot/kured/releases | jq -r '.[0].tag_name')
kubectl apply -f "https://github.com/kubereboot/kured/releases/download/$latest/kured-$latest-combined.yaml"
```

If you want to customise the installation, download the manifest and
edit it in accordance with the following section before application.

## Using the Helm-Chart

Kured also provides its own helm-chart. Detailed instructions and documentation can be found [here](https://github.com/kubereboot/charts/tree/main/charts/kured).

## Kubernetes & OS Compatibility

The daemon image contains versions of `k8s.io/client-go` and
`k8s.io/kubectl` (the binary of `kubectl` in older releases) for the purposes of
maintaining the lock and draining worker nodes. Kubernetes aims to provide
forwards and backwards compatibility of one minor version between client and
server:

| kured  | {k8s.io/,}kubectl | k8s.io/client-go | k8s.io/apimachinery | expected kubernetes compatibility |
| ------ | ----------------- | ---------------- | ------------------- | --------------------------------- |
| 1.23.0 | 0.36.2            | v0.36.2          | v0.36.2             | 1.35.x, 1.36.x, 1.37.x            |
| 1.22.1 | 0.35.4            | v0.35.4          | v0.35.4             | 1.34.x, 1.35.x, 1.36.x            |
| 1.22.0 | 0.35.4            | v0.35.4          | v0.35.4             | 1.34.x, 1.35.x, 1.36.x            |
| 1.21.0 | 0.34.3            | v0.34.3          | v0.34.3             | 1.33.x, 1.34.x, 1.35.x            |
| 1.20.0 | 0.33.4            | v0.33.4          | v0.33.4             | 1.32.x, 1.33.x, 1.34.x            |
| 1.19.0 | 0.32.8            | v0.32.8          | v0.32.8             | 1.31.x, 1.32.x, 1.33.x            |
| 1.17.1 | 0.30.10           | v0.30.10         | v0.30.10            | 1.29.x, 1.30.x, 1.31.x            |
| 1.16.2 | 0.29.9            | v0.29.9          | v0.29.9             | 1.28.x, 1.29.x, 1.30.x            |
| 1.15.1 | 0.28.8            | v0.28.8          | v0.28.8             | 1.27.x, 1.28.x, 1.29.x            |
| 1.14.2 | 0.27.6            | v0.27.6          | v0.27.6             | 1.26.x, 1.27.x, 1.28.x            |
| 1.13.2 | 0.26.7            | v0.26.7          | v0.26.7             | 1.25.x, 1.26.x, 1.27.x            |
| 1.12.2 | 0.25.5            | v0.25.5          | v0.25.5             | 1.24.x, 1.25.x, 1.26.x            |
| 1.11.0 | 0.24.7            | v0.24.7          | v0.24.7             | 1.23.x, 1.24.x, 1.25.x            |
| 1.10.2 | 0.23.6            | v0.23.6          | v0.23.6             | 1.22.x, 1.23.x, 1.24.x            |
| 1.9.2  | 0.22.4            | v0.22.4          | v0.22.4             | 1.21.x, 1.22.x, 1.23.x            |
| 1.8.1  | 0.21.4            | v0.21.4          | v0.21.4             | 1.20.x, 1.21.x, 1.22.x            |
| 1.7.0  | 0.20.5            | v0.20.5          | v0.20.5             | 1.19.x, 1.20.x, 1.21.x            |
| 1.6.1  | 0.19.4            | v0.19.4          | v0.19.4             | 1.18.x, 1.19.x, 1.20.x            |
| 1.5.1  | 0.18.8            | v0.18.8          | v0.18.8             | 1.17.x, 1.18.x, 1.19.x            |
| 1.4.4  | 1.17.7            | v0.17.0          | v0.17.0             | 1.16.x, 1.17.x, 1.18.x            |
| 1.3.0  | 1.15.10           | v12.0.0          | release-1.15        | 1.15.x, 1.16.x, 1.17.x            |
| 1.2.0  | 1.13.6            | v10.0.0          | release-1.13        | 1.12.x, 1.13.x, 1.14.x            |
| 1.1.0  | 1.12.1            | v9.0.0           | release-1.12        | 1.11.x, 1.12.x, 1.13.x            |
| 1.0.0  | 1.7.6             | v4.0.0           | release-1.7         | 1.6.x, 1.7.x, 1.8.x               |

See the [release notes](https://github.com/kubereboot/kured/releases)
for specific version compatibility information, including which
combination have been formally tested.

Versions >=1.1.0 enter the host mount namespace to invoke
`systemctl reboot`, so should work on any systemd distribution.
