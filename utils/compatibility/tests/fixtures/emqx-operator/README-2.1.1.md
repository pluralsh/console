<!-- Excerpt: https://raw.githubusercontent.com/emqx/emqx-operator/2.1.1/README.md ; fetched 2026-09-08 -->

## Prerequisites

The EMQX Operator requires a Kubernetes cluster of version `>=1.24`.

> ### Why we need kubernetes 1.24:
>
> The `MixedProtocolLBService` feature is enabled by default in Kubernetes 1.24 and above. For its documentation, please refer to: [MixedProtocolLBService](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/). The `MixedProtocolLBService` attribute allows different protocols to be used within the same Service instance of type `LoadBalancer`. Therefore, if the user deploys the EMQX cluster on Kubernetes and uses the `LoadBalancer` type of Service, there are both TCP and UDP protocols in the Service, please pay attention to upgrading the Kubernetes version to 1.24 or above, otherwise the Service creation will fail.
> 
> **If user doesn't need `MixedProtocolLBService` feature, the EMQX Operator requires a Kubernetes cluster of version `>=1.21`.**
