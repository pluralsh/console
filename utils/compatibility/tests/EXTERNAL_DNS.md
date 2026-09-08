# ExternalDNS compatibility validation

Run from the repository root with the existing compatibility dependencies:

```sh
python -m unittest discover -s utils/compatibility/tests -v
```

The ExternalDNS tests use a reduced copy of the immutable v0.22.0 README matrix
and synthetic registry metadata with computed byte digests. They require no
network, Helm, Docker credentials, DNS credentials, or paid summarization.

The scraper discovers stable application releases in the latest 100 GitHub
release records, excluding draft/prerelease/chart-only tags. New releases read
their own tagged README matrix. The explicitly compatible open Kubernetes range
is capped at the repository's configured `KUBE_VERSION`, currently 1.36; this is
not a claim that 1.36 is the newest upstream Kubernetes version. Recorded legacy
history is preserved. If the configured ceiling differs from the highest saved supported
minor, recorded releases from 0.22 onward recheck their own immutable matrices.
An explicit finite range is never extended beyond its source. Only changed
Kubernetes lists are updated; summary/images/EOL and any simultaneous exact chart
backfill are preserved. Unchanged ceilings produce no writes. Missing exact charts
can be filled later, even for legacy versions outside the current release list, without replacing stored compatibility.
Strictly newer stable charts for the same recorded application also update;
equal, older, and prerelease mappings do not. The normal writer refreshes chart
images while preserving compatibility, custom summaries, requirements and EOL.
Regression tests exercise chart advancement, image refresh, the subsequent no-op,
rollback rejection, and a simultaneous support-ceiling refresh.

Sources verified on 2026-09-08:

- [Stable release and migration notes](https://github.com/kubernetes-sigs/external-dns/releases/tag/v0.22.0).
- [Tagged compatibility matrix](https://github.com/kubernetes-sigs/external-dns/blob/v0.22.0/README.md#kubernetes-version-compatibility): ExternalDNS >=0.18.x supports Kubernetes 1.21, 1.22–1.32 and >=1.33; 1.19 and 1.20 are explicitly incompatible.
- [Official Helm index](https://kubernetes-sigs.github.io/external-dns/index.yaml): latest chart 1.21.1 packages app 0.21.0; no 0.22.0 mapping was invented.
- [Public release image index](https://registry.k8s.io/v2/external-dns/external-dns/manifests/v0.22.0): index SHA256 `5fdcaf7deb5c158f93a1fc6fe169cdff4cfb9ae0172bee1a90ab0ef74fb9c9cf`. The scraper verifies index, selected Linux amd64 manifest and configuration byte digests without fetching image layers. The release explicitly names this image tag. Configuration revision is empty, so it does not independently prove a Git commit.

The tagged [Kustomization](https://github.com/kubernetes-sigs/external-dns/blob/v0.22.0/kustomize/kustomization.yaml)
and [AWS tutorial](https://github.com/kubernetes-sigs/external-dns/blob/v0.22.0/docs/tutorials/aws.md)
still reference 0.21.0. They were excluded as evidence for the 0.22.0 image.
If a future registry artifact cannot be verified, compatibility can be recorded
with an explicitly empty images list; no image is inferred from a tag string.
Direct OCI/Docker manifests and manifests selected through an image index must
both have a digest-verified configuration declaring `os: linux` and
`architecture: amd64`. An index descriptor alone is insufficient. Regression
tests accept Linux/amd64 direct manifests and reject arm64, Windows, and missing
platform configuration in both paths, including inconsistent index claims.

The 0.22.0 generated summary records the required explicit policy, annotation
prefix migration, removed Plural/Akamai/Transip providers, and upstream's warning
that dry-run does not prevent changes for ns1/hetzner/alibaba providers.
Its chart-independent support statement remains accurate after chart packaging
arrives, so backfills need not overwrite any generated or custom summary text.

Live validation read official sources and rendered all 13 retained historical
Helm charts with isolated Helm/Docker paths and both optional paid API keys unset.
There was no Kubernetes installation, image execution, image-layer download, or
DNS operation. Existing 13 records remain exactly unchanged; only the 0.22.0 row
is added. Both generated YAML schemas pass, unrelated add-ons are unchanged, and
a repeated live scrape calls no writer or image verifier.
