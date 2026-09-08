import importlib
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scraper = importlib.import_module("scrapers.volcano")
FIXTURE = Path(__file__).parent / "fixtures" / "volcano-compatibility.md"


def matrix(row="| Volcano v1.15 | ✓ | - | + |", headers="Kubernetes 1.35 | Kubernetes 1.34 | Kubernetes 1.33"):
    return f"| | {headers} |\n|---|---|---|---|\n{row}\n"


def test_published_matrix_joins_only_released_documented_families():
    rows = scraper.collect_versions(FIXTURE.read_text(encoding="utf8"), {
        "1.15.2": "1.15.2", "1.14.4": "1.14.4", "1.10.0": "1.10.0",
        "1.16.0-alpha.1": "1.16.0-alpha.1", "1.16.0": "1.16.0",
        "0.1": "1.9.1", "1.15.3": "1.15.3-rc.1",
    })
    assert [r["version"] for r in rows] == ["1.15.2", "1.14.4", "1.10.0"]
    assert rows[0]["kube"] == [f"1.{minor}" for minor in range(35, 23, -1)]
    assert rows[1]["kube"] == [f"1.{minor}" for minor in range(34, 22, -1)]
    assert rows[2]["kube"] == [f"1.{minor}" for minor in range(30, 20, -1)]


def test_plus_minus_and_head_are_not_exact_release_compatibility():
    content = matrix() + "| Volcano HEAD (master) | ✓ | ✓ | ✓ |\n"
    assert scraper.parse_kube_versions(content, "1.15.2") == ["1.35"]


def test_numeric_sort_and_chart_version_are_preserved():
    content = matrix(headers="Kubernetes 1.9 | Kubernetes 1.10 | Kubernetes 1.11",
                     row="| Volcano v1.15 | ✓ | ✓ | ✓ |")
    rows = scraper.collect_versions(content, {"1.15.2": "2.0.0", "1.15.10": "2.1.0"})
    assert [r["version"] for r in rows] == ["1.15.10", "1.15.2"]
    assert rows[0]["chart_version"] == "2.1.0"
    assert rows[0]["kube"] == ["1.11", "1.10", "1.9"]


@pytest.mark.parametrize("content", [
    "", "<html>Upstream unavailable</html>",
    matrix(row="| Volcano v1.15 | ✓ | - |"),
    matrix(row="| Volcano v1.15 | ? | - | + |"),
    matrix(row="| Volcano v1.15 | - | - | + |"),
    matrix(headers="Kubernetes 1.35 | Kubernetes 1.35 | Kubernetes 1.33"),
    matrix(headers="Kubernetes 1.35 | Kubernetes latest | Kubernetes 1.33"),
    matrix() + "| Volcano v1.15 | ✓ | - | + |\n",
])
def test_rejects_malformed_or_ambiguous_matrix(content):
    with pytest.raises(ValueError):
        scraper.collect_versions(content, {"1.15.2": "1.15.2"})


@pytest.mark.parametrize("charts", [{}, {"0.1": "1.9.1"}, {"1.16.0": "1.16.0"}])
def test_empty_join_is_an_error(charts):
    with pytest.raises(ValueError):
        scraper.collect_versions(matrix(), charts)


def test_scrape_passes_validated_rows_to_shared_updater(monkeypatch):
    response = Mock(text=matrix())
    get = Mock(return_value=response)
    update = Mock()
    monkeypatch.setattr(scraper.requests, "get", get)
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _: {"1.15.2": "1.15.2"})
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    scraper.scrape()
    get.assert_called_once_with(scraper.README_URL, timeout=30)
    response.raise_for_status.assert_called_once()
    path, rows = update.call_args.args
    assert path == scraper.TARGET_FILE
    assert rows[0]["version"] == "1.15.2"
    assert rows[0]["kube"] == ["1.35"]


@pytest.mark.parametrize("failure", ["http", "network", "matrix", "charts"])
def test_failure_does_not_write(monkeypatch, failure):
    response = Mock(text="bad matrix" if failure == "matrix" else matrix())
    if failure == "http":
        response.raise_for_status.side_effect = requests.HTTPError("503")
    get = Mock(return_value=response)
    if failure == "network":
        get.side_effect = requests.Timeout()
    monkeypatch.setattr(scraper.requests, "get", get)
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _: {} if failure == "charts" else {"1.15.2": "1.15.2"})
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    with pytest.raises((ValueError, requests.RequestException)):
        scraper.scrape()
    update.assert_not_called()


def test_shared_updater_preserves_metadata_and_unlisted_historical_rows(monkeypatch, tmp_path):
    import utils
    import yaml

    target = tmp_path / "volcano.yaml"
    target.write_text(yaml.safe_dump({
        "icon": "https://example.test/logo.png",
        "helm_repository_url": "https://example.test/charts",
        "versions": [{"version": "1.9.0", "kube": ["1.29"], "chart_version": "1.9.0"}],
    }))
    monkeypatch.setattr(utils, "get_chart_images", lambda *args: [])
    monkeypatch.setattr(utils, "summarization_enabled", lambda: False)
    rows = scraper.collect_versions(matrix(), {"1.15.2": "1.15.2"})
    utils.update_compatibility_info(str(target).replace("\\", "/"), rows)
    stored = yaml.safe_load(target.read_text())
    assert stored["icon"] == "https://example.test/logo.png"
    assert [r["version"] for r in stored["versions"]] == ["1.15.2", "1.9.0"]
    assert stored["versions"][0]["kube"] == ["1.35"]
