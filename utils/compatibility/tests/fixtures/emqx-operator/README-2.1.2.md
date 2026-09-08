<!-- Excerpt: https://raw.githubusercontent.com/emqx/emqx-operator/2.1.2/README.md ; fetched 2026-09-08 -->

## How to selector Kubernetes version

The EMQX Operator requires a Kubernetes cluster of version `>=1.24`.

| Kubernetes Versions     | EMQX Operator Compatibility                                  | Notes                                                        |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1.24 or higher          | All functions supported                                      |                                                              |
| 1.21 (included) ～ 1.23 | Supported, except [MixedProtocolLBService](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) | EMQX cluster can only use one protocol in `LoadBalancer` type of Service, for example TCP or UDP. |
| 1.20 (included) ～ 1.21 | Supported, manual `.spec.ports[].nodePort` assignment required if using `NodePort` type of Service | For more details, please refer to [Kubernetes changelog](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md#bug-or-regression-4). |
| 1.16 (included) ～ 1.20 | Supported, not recommended due to lack of testing            |                                                              |
| Lower than 1.16         | Not supported                                                | `apiextensions/v1` APIVersion is not supported.               |
