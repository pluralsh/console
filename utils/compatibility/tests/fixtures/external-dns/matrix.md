## Kubernetes version compatibility

Breaking changes were introduced in external-dns in the following versions:

- [`v0.10.0`](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.10.0): use of `networking.k8s.io/ingresses` instead of `extensions/ingresses` (see [#2281](https://github.com/kubernetes-sigs/external-dns/pull/2281))
- [`v0.18.0`](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.18.0): use of `discovery.k8s.io/endpointslices` instead of `endpoints` (see [#5493](https://github.com/kubernetes-sigs/external-dns/pull/5493))
- [`v0.19.0`](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.19.0): don't expose internal ipv6 by default (see [#5575](https://github.com/kubernetes-sigs/external-dns/pull/5575)) and disable legacy listeners on `traefik.containo.us` API Group (see [#5565](https://github.com/kubernetes-sigs/external-dns/pull/5565))

| ExternalDNS                  |      ≤ 0.9.x       | ≥ 0.10.x and ≤ 0.17.x |      ≥ 0.18.x      |
| ---------------------------- | :----------------: | :-------------------: | :----------------: |
| Kubernetes ≤ 1.18            | :white_check_mark: |          :x:          |        :x:         |
| Kubernetes 1.19 and 1.20     | :white_check_mark: |  :white_check_mark:   |        :x:         |
| Kubernetes 1.21              | :white_check_mark: |  :white_check_mark:   | :white_check_mark: |
| Kubernetes ≥ 1.22 and ≤ 1.32 |        :x:         |  :white_check_mark:   | :white_check_mark: |
| Kubernetes ≥ 1.33            |        :x:         |          :x:          | :white_check_mark: |

