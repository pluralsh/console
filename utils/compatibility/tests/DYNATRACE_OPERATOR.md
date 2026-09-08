# Dynatrace Operator compatibility

From the repository root, create a Python environment and run the offline tests:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r utils/compatibility/requirements.txt
.venv/bin/python -m unittest discover -s utils/compatibility/tests -p 'test_dynatrace_operator.py' -v
.venv/bin/python -m unittest discover -s utils/compatibility/tests -p 'test_chart_images.py' -v
```

The fixtures are exact extracts retrieved on 2026-09-08 from Dynatrace's
[support model](https://docs.dynatrace.com/docs/ingest-from/technology-support/support-model-and-issues)
and [stable Helm index](https://raw.githubusercontent.com/Dynatrace/dynatrace-operator/main/config/helm/repos/stable/index.yaml).
The table lists verified/tested combinations and recommends Operator `v1.9.0+`
for its explicit Kubernetes rows 1.27–1.36. The scraper applies that version
relationship only to stable releases present in the chart index. It does not
expand chart `kubeVersion` installation floors into tested ranges or invent
unlisted Kubernetes minors. Exact recommendations and `x` wildcards remain
restricted to their stated release or minor.

These rows record the vendor's recommendation relationship, not current full
support for every combination. The source also specifies OneAgent/ActiveGate
minima, feature restrictions and Kubernetes/OpenShift end-of-support dates. It
states that the latest three Operator versions are tested with the latest
Kubernetes/OpenShift versions. Some historical Kubernetes rows are already past
their stated end-of-support date. No Kubernetes cluster matrix was run locally.

The repository's reducer retains the first release in each minor, changes in
Kubernetes coverage and the overall latest patch. Thus this update retains
1.9.0, 1.10.0 and 1.10.2; redundant 1.10.1 is not added. Existing 1.8.1 has the same
Kubernetes coverage as 1.8.0 and ceases to be the latest overall release, so it is
removed normally. The other historical compatibility fields remain intact.

Live regeneration uses Helm and public HTTP requests:

```sh
cd utils/compatibility
env -u EXA_API_KEY -u OPENAI_API_KEY ../../.venv/bin/python -c 'import importlib; importlib.import_module("scrapers.dynatrace-operator").scrape()'
```

Use an isolated Helm configuration/cache and Docker configuration if the host has
unrelated registries or credential helpers. Regeneration updates the per-app YAML;
keep its entry in `static/compatibilities.yaml` synchronized before submitting.

Validation performed: 17 offline tests; exact archive SHA-256 and Chart.yaml
name/appVersion/version verification for 1.9.0, 1.10.0 and 1.10.2; successful Helm
rendering for those releases and six retained historical releases; schema checks
for both YAML files; repeat-run byte stability; and a comparison proving no other
aggregate application changed. Rendering populated six historical empty image
arrays (1.8.0, 1.7.0, 1.4.0, 1.3.0, 1.0.0 and 0.12.0). The legacy 0.6.0 chart requires
an apiToken with default values, so its existing empty image array is preserved.
No token was provided and no paid summarization API was used.
