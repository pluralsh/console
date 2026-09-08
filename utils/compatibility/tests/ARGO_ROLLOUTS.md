# Argo Rollouts compatibility tests

From the repository root, create a virtual environment and install the scraper dependencies plus the test runner:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r utils/compatibility/requirements.txt pytest==8.4.2
env -u EXA_API_KEY -u OPENAI_API_KEY .venv/bin/python -m pytest utils/compatibility/tests/test_argo_rollouts.py utils/compatibility/tests/test_chart_images.py -q
```

The tests use release-tag matrix excerpts and mocked network responses; they do not call external APIs or Helm. Fixtures include their official upstream source URLs. A live scraper run separately verifies the current release tags, Helm index mapping, and rendered chart images.
