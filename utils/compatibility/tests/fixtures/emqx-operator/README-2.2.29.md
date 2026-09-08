<!-- Excerpt: https://raw.githubusercontent.com/emqx/emqx-operator/2.2.29/README.md ; fetched 2026-09-08 -->

## How to selector Kubernetes version

The EMQX Operator requires a Kubernetes cluster of version `>=1.24`.

| Kubernetes Versions     | EMQX Operator Compatibility                                  | Notes                                                        |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1.24 (included) ~ latest | All functions supported                                      |  |
| 1.22 (included) ～ 1.23 | Supported, except [MixedProtocolLBService](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) | EMQX cluster can only use one protocol in `LoadBalancer` type of Service, for example TCP or UDP. |
| Lower than 1.22       | Not supported                                                | `unknown field "x-kubernetes-validations" in io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.JSONSchemaProps]` |
