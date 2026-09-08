MetalLB chart-index fixture retrieved 2026-09-08 from:
https://metallb.github.io/metallb/index.yaml

The index explicitly pairs appVersion, chart version and kubeVersion. The
scraper models only its published >= 1.MINOR.0[-0] constraint. Expansion is
bounded by KUBE_VERSION and describes Helm installation eligibility, not an
upstream tested matrix. Legacy entries without kubeVersion and the placeholder
chart 0.0.0 (whose archive returns 404) are omitted.

Five rows remain after the shared writer's minor-version reduction. Each chart
was rendered with Helm 3.18.6 at Kubernetes 1.36 and its container images were
collected by the shared helper. The frr-k8s.prometheus.serviceMonitor.enabled=false
value avoids the missing nested value in the 0.16.0 packaged dependency and
keeps optional ServiceMonitor generation disabled. This was chart rendering,
not a deployment or network/BGP test.

Upstream scope and additional requirements:
https://metallb.io/concepts/maturity/#kubernetes-compatibility
https://metallb.io/installation/network-addons/
https://metallb.io/installation/clouds/
