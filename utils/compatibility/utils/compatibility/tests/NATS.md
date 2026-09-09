# NATS compatibility tests

The NATS scraper records Kubernetes minors only when the matching NATS Helm chart release tag contains explicit install-test evidence in `.github/workflows/test.yaml`.

The evidence must contain a finite `matrix.k8s`, use that matrix to create the MicroK8s cluster, and run `ct install --all --chart-dirs helm/charts` without excluding `nats`, conditionalizing the evidence, or allowing the install to fail.

The evidence floor is chart `0.13.2`. Older NATS chart releases are not treated as unsupported; their tagged workflows simply do not expose the explicit Kubernetes minor matrix required by this scraper.

From the repository root, install the compatibility scraper requirements plus pytest and run:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r utils/compatibility/requirements.txt pytest==8.4.2
env -u EXA_API_KEY -u OPENAI_API_KEY .venv/bin/python -m pytest utils/compatibility/tests/test_nats.py utils/compatibility/tests/test_chart_images.py -q
```

The focused tests use release-tag workflow excerpts and mocked network responses; they do not call external APIs or Helm. The fixture comments contain their official upstream source URLs. A live scraper run is still required to verify the current Helm index, every selected release tag, rendered chart images, and the generated aggregate compatibility table.
