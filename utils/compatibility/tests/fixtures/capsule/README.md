# Capsule fixtures

Retrieved September 8, 2026 from the upstream project.

- `releases.json` contains the release flags and the exact Kubernetes compatibility sections from [v0.14.4](https://github.com/projectcapsule/capsule/releases/tag/v0.14.4) and [v0.7.4](https://github.com/projectcapsule/capsule/releases/tag/v0.7.4), returned by the GitHub releases API. These exercise the quoted and unquoted table formats. The surrounding changelogs are omitted.
- `chart.yaml` is the output of `helm show chart oci://ghcr.io/projectcapsule/charts/capsule --version 0.14.4`. Helm reported manifest digest `sha256:1da7a5742a2b30ed30e71832cf875becbc6a49551d020c940db52cf34045644e`. The published package has real version fields; the source tree's Chart.yaml has `0.0.0` placeholders.

Run from `utils/compatibility` with the compatibility requirements installed:

```sh
python -m unittest discover -s tests -p 'test_capsule.py' -v
```

The tests make no network requests and deploy no clusters. They mock the HTTP and Helm boundaries and exercise the real parser, version reduction, and YAML writer. Live chart lookup/rendering is a separate validation step.

The scraper only records minors explicitly named in each release's table. A `>= 1.36.0` minimum within a `v1.36` row does not establish support for 1.37. Releases without a compatibility section are omitted. If a future table requires a nonzero Kubernetes patch, it is rejected because this catalog cannot represent that requirement accurately using minor versions alone.
