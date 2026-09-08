# YuniKorn compatibility scraper verification

This scraper derives Kubernetes compatibility from Apache YuniKorn's official version matrix and resolves concrete application/chart versions from the official Helm index.

## Source boundaries

- Support matrix: `apache/yunikorn-site` `docs/get_started/version.md`
- Helm index: `https://apache.github.io/yunikorn-release/index.yaml`
- Only stable exact `appVersion == chart version` mappings are accepted.
- `Support ended` is treated as an exclusive upper bound.
- Open-ended support is bounded to Kubernetes minors explicitly present in the upstream matrix; the scraper does not infer future Kubernetes versions.
- Unsupported/malformed source rows fail closed and do not update checked-in compatibility data.

## Checked-in coverage

The generated `static/compatibilities/yunikorn.yaml` currently covers stable YuniKorn releases from `0.8.0` through `1.9.0` where an official Helm chart mapping exists and at least one Kubernetes minor is supported by the upstream matrix.

## Focused regression coverage

`utils/compatibility/tests/test_yunikorn.py` verifies:

- parsing of the authoritative support matrix;
- exclusive end-version semantics;
- no inferred Kubernetes `1.36` support beyond the current upstream table;
- fail-closed behavior for malformed rows/headings and source failures;
- stable exact Helm mappings and rejection of conflicting mappings;
- atomic update behavior: no compatibility update until both sources validate.

## Aggregate file note

`static/compatibilities.yaml` is currently an empty checked-in file on upstream `master`; the compatibility generator writes the aggregate at runtime. This contribution therefore keeps the canonical per-application file and manifest entry synchronized and does not synthesize a separate aggregate artifact in the PR.
