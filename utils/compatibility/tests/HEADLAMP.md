# Headlamp compatibility source and coverage

The scraper uses the [official Helm index](https://kubernetes-sigs.github.io/headlamp/index.yaml) and the `headlamp/README.md` and `headlamp/Chart.yaml` files inside each selected release archive. It checks the index's SHA256 digest and verifies chart name, chart version and application version before reading requirements. Archives are read in memory, never extracted to disk.

## Interpretation

Only the `Prerequisites` section supplies the Kubernetes minimum. Optional feature requirements elsewhere in the README (such as the pod disruption budget field requiring Kubernetes 1.27) do not replace the baseline. The documented minimum is expanded through the repository's `KUBE_VERSION`, following the existing minimum-based scraper convention. This records declared requirements, not evidence of testing every cluster version or every optional configuration.

Each application minor uses its latest stable application patch, then its latest stable chart. Application and chart versions are distinct: Headlamp 0.32.0 uses chart 0.32.1. Prereleases are excluded.

## Initial evidence, 2026-09-08

All 54 archives in the current index were inspected and their digests verified. Charts before 0.28.0 do not declare a Kubernetes prerequisite in their packaged README; they are deliberately excluded rather than assigning today's minimum retroactively. The initial table contains 18 application minors, 0.28.1 through 0.45.0, each declaring Kubernetes 1.21 or later. A missing/changed prerequisite on a newly eligible chart is an error, not a reason to invent a range or write partial results.

Representative immutable release archives:

- [Chart 0.45.0 / application 0.45.0](https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-0.45.0/headlamp-0.45.0.tgz)
- [Chart 0.32.1 / application 0.32.0](https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-0.32.1/headlamp-0.32.1.tgz)
- [Chart 0.28.1 / application 0.28.1](https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-0.28.1/headlamp-0.28.1.tgz)
- [Chart 0.27.0, excluded](https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-0.27.0/headlamp-0.27.0.tgz)

The index may use historical `headlamp-k8s` or `kinvolk` GitHub release URLs; the scraper also accepts those original upstream locations.

## Verification

From the repository root, with compatibility requirements installed:

```sh
python -m unittest discover -s utils/compatibility/tests -p test_headlamp.py -v
```

The tests cover release ordering, chart/application identity, per-release minimums, optional-feature separation, checksum validation, missing members, unsupported archive hosts, missing prerequisites, future Kubernetes floors, and writer integration. They use in-memory chart archives and do not call the network or external AI services.

The production entry point is `SCRAPER=headlamp python main.py` from `utils/compatibility`. The existing runner also performs shared image enrichment and aggregate generation; those are not replaced by this scraper.
