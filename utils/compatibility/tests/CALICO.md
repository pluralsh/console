# Calico compatibility tests

From the repository root, create a virtual environment and install the scraper dependencies plus the test runner:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r utils/compatibility/requirements.txt pytest==8.4.2
env -u EXA_API_KEY -u OPENAI_API_KEY .venv/bin/python -m pytest utils/compatibility/tests/test_calico.py -q
```

The tests use verbatim copies of the upstream versioned docs and mocked network responses; they do not call GitHub, the Helm index, Helm, or the summarizer. The writer-boundary tests run the real `update_compatibility_info` against a temporary copy of `static/compatibilities/calico.yaml`.

## Fixture sources

Calico publishes the tested Kubernetes list per release family in `tigera/docs` under `calico_versioned_docs/version-<family>`. Current families live on `main`; retired families move to `archive-os-<family>` (or `archive-oss-<family>`) branches with the same layout. The scraper confirms the family via `variables.js` before reading the list.

| Fixture | Upstream file (pinned commit) |
| --- | --- |
| `calico-v3.32-requirements.mdx` | `main` @ `f301ec498c25128d01402c26ebd4af43652f56f6`: `calico_versioned_docs/version-3.32/getting-started/kubernetes/requirements.mdx` |
| `calico-v3.32-system-requirements.mdx` | same commit: `calico_versioned_docs/version-3.32/_includes/partials/_system-requirements.mdx` (last changed in `9b8e206648cca1097b440811d945ba8f7ce12382`) |
| `calico-v3.32-variables.js` | same commit: `calico_versioned_docs/version-3.32/variables.js` |
| `calico-v3.28-requirements.mdx` | `archive-os-3.28` @ `238e9ef2465941d906011e153129e9d1e3ec5ef7`: `calico_versioned_docs/version-3.28/getting-started/kubernetes/requirements.mdx` |
| `calico-v3.28-variables.js` | same commit: `calico_versioned_docs/version-3.28/variables.js` |

Rendered equivalents: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements (3.32) and https://docs.tigera.io/archive/v3.28/getting-started/kubernetes/requirements (3.28).
