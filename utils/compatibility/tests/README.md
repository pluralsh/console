# Spark Operator scraper verification

Run from the repository root:

```sh
python -m unittest discover -s utils/compatibility/tests -v
```

The scraper reads the **Version Matrix** in the upstream
[Kubeflow Spark Operator README](https://github.com/kubeflow/spark-operator#version-matrix),
matches modern operator families against `appVersion` in the official
[Helm index](https://kubeflow.github.io/spark-operator/index.yaml), and expands the
documented open-ended Kubernetes minimum only as far as this repository's
`KUBE_VERSION`. This represents upstream's declared compatibility, not a claim
that every expanded Kubernetes version was independently tested.

Only documented modern semver families are emitted. Legacy `v1beta2-...` tags
encode both operator and Spark versions and are excluded because they do not
fit the shared version sorting and standard `v{vsn}` release URL. New families
absent from the upstream matrix are also excluded. As of the initial generation,
this includes operator 2.4 and 2.5. Prerelease app versions are excluded.

For a live generation, install `requirements.txt` and Helm, then run from
`utils/compatibility`:

```sh
python -c "import importlib; importlib.import_module('scrapers.spark-operator').scrape()"
```

The shared updater reduces patch versions using the repository's existing
convention and resolves container images through Helm. No Kubernetes cluster
is needed for generation. Optional paid summarization is not needed for this
scraper; leave its API keys unset when verifying only compatibility data.
