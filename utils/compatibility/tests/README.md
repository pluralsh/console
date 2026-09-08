# Compatibility scraper tests

From `utils/compatibility`, install the same constrained dependencies as CI:

```sh
python -m pip install -r requirements.txt -c tests/constraints.txt
python -m unittest discover -s tests -v
```

`constraints.txt` pins the tested direct and transitive dependency versions for
Python 3.13. To refresh it, install `requirements.txt` in a clean Python 3.13
environment, run the tests, and regenerate it with `python -m pip freeze`.
Review the version changes and rerun the tests using the new constraints before
committing. These test constraints do not change the daily updater's dependencies.

The tests run offline, with HTTP and Helm replaced at their external boundaries.
The integration test uses the real YAML writer, version reducer, and image parser.
It checks repeatable output and preservation of existing data on source failures.

## Kueue sources

Kueue publishes its Helm chart to
`oci://registry.k8s.io/kueue/charts/kueue`. The scraper discovers stable chart tags
from the registry and reads the README at each corresponding Git release tag.
It records the Kubernetes versions explicitly linked from the release's E2E test
coverage. An installation minimum such as "1.29 or newer" does not supply an
upper bound, so the scraper does not expand it into a compatibility range.

The fixtures are production-readiness excerpts from the Apache-2.0
licensed [Kueue repository](https://github.com/kubernetes-sigs/kueue), with source
URLs embedded at the top. They cover the original E2E layout (v0.9.5) and the
baseline/extended suite layout (v0.19.3). Signature, attestation, and prerelease
tags are excluded. Releases without a published Helm chart are not inferred.
