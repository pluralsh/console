# KubeBlocks compatibility source

The scraper reads `kubeVersion` from each released chart entry in the
[official Helm index](https://apecloud.github.io/helm-charts/index.yaml).
It records declared Helm installation lower bounds, capped at this repository's
`KUBE_VERSION`. This is not a claim that every Kubernetes minor was cluster-tested,
nor a compatibility promise for every optional database add-on.

Application and chart versions are parsed independently and compared semantically.
Prerelease/build versions and deprecated chart entries are excluded. Every
application patch remains available to the shared reducer, since requirements
change within a minor: chart 0.8.0 declares `>=1.22.0-0`, while 0.8.2 declares
`>=1.20.0-0`. Selecting just the latest patch in each minor would lose that boundary.
Unknown or patch-specific Kubernetes constraints stop generation before writing;
they are not approximated as complete minor-version support.

The official stable 1.0.2 release still carries the legacy
`artifacthub.io/prerelease: "true"` chart annotation. Version filtering therefore
uses the semantic version fields, consistently with the published stable release:
[v1.0.2](https://github.com/apecloud/kubeblocks/releases/tag/v1.0.2).

## Validation

From the repository root, run:

```sh
python -m pytest utils/compatibility/tests -q
```

From `utils/compatibility`, with Helm available and API summarization disabled:

```sh
env -u EXA_API_KEY -u OPENAI_API_KEY python -c \
  'import importlib; importlib.import_module("scrapers.kubeblocks").scrape()'
```

The September 9, 2026 index contains 29 entries with stable semantic versions.
The shared pipeline retains eight rows, renders their charts to extract images,
and preserves the 0.8.0/0.8.2 requirement transition. Local validation used Python
3.14 and Helm 4.2.4. No live Kubernetes cluster, database deployment, or full
Console integration test was run.

## Upstream archive-integrity discrepancy

A supplemental audit of all 29 stable-version archives confirms that packaged
`name`, `version`, `appVersion`, and `kubeVersion` fields match the index.
Twenty archive digests match; nine differ: 1.0.0, 0.9.1, 0.9.0, 0.8.4, 0.8.3,
0.8.0, 0.5.3, 0.5.2, and 0.5.1. For example, 1.0.0 has a reproducible discrepancy:

- [Official archive](https://github.com/apecloud/helm-charts/releases/download/kubeblocks-1.0.0/kubeblocks-1.0.0.tgz)
- Index SHA256: `7cc7d54a3b6a1325833813122f4115fc265b17b19a5ed59e31ec9a4ed29f230a`
- Download SHA256: `70076d0843ed9104aeac6bb35c5297cd253d8e50ccbfb75e478b44449300aa37`

Two downloads returned the same 25,568-byte archive, matching the release asset's
published size. Its relevant metadata matches the index. This does not resolve
the integrity discrepancies; archive authenticity for those versions is not claimed
on the basis of the index checksum. The scraper follows the existing index/shared
Helm-rendering pipeline and does not introduce or bypass an integrity check.
