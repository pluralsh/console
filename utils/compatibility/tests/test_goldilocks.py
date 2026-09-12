import importlib.util
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests
import yaml

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "goldilocks_scraper", COMPATIBILITY / "scrapers" / "goldilocks.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def index(entries):
    return yaml.safe_dump({"entries": {"goldilocks": entries}})


def chart(version, app_version, kube_version=">= 1.22.0-0", **extra):
    return {
        "version": version,
        "appVersion": app_version,
        "kubeVersion": kube_version,
        **extra,
    }


def test_parses_explicit_floor_through_repository_kube_version():
    rows = scraper.parse_index(index([chart("11.1.0", "v4.16.1")]), "1.36")
    assert rows == [{
        "version": "4.16.1",
        "kube": [f"1.{minor}" for minor in range(36, 21, -1)],
        "chart_version": "11.1.0",
        "images": [],
        "requirements": [],
        "incompatibilities": [],
    }]


def test_keeps_newest_stable_chart_for_each_application_version():
    rows = scraper.parse_index(index([
        chart("11.0.0", "v4.16.1"),
        chart("11.1.0", "v4.16.1"),
        chart("10.6.0", "v4.14.1"),
    ]), "1.36")
    assert [(row["version"], row["chart_version"]) for row in rows] == [
        ("4.16.1", "11.1.0"),
        ("4.14.1", "10.6.0"),
    ]


def test_skips_prerelease_deprecated_and_unconstrained_history():
    rows = scraper.parse_index(index([
        chart("11.1.0-rc.1", "v4.16.1"),
        chart("11.0.0", "v4.16.1", deprecated=True),
        {"version": "6.4.0", "appVersion": "v4.5.1"},
        chart("10.6.0", "v4.14.1"),
    ]), "1.36")
    assert [row["version"] for row in rows] == ["4.14.1"]


@pytest.mark.parametrize("constraint", [">1.22.0", "^1.22", ">= 1.22 < 1.36", "1.22", 1.22])
def test_rejects_ambiguous_kube_constraints(constraint):
    with pytest.raises(ValueError, match="kubeVersion"):
        scraper.parse_index(index([chart("11.1.0", "v4.16.1", constraint)]), "1.36")


@pytest.mark.parametrize("content", ["", "[]", "{}", "entries: {}", "entries: {goldilocks: []}"])
def test_rejects_missing_or_malformed_index(content):
    with pytest.raises(ValueError):
        scraper.parse_index(content, "1.36")


def test_failed_fetch_does_not_write(monkeypatch):
    response = Mock()
    response.raise_for_status.side_effect = requests.HTTPError("503")
    get = Mock(return_value=response)
    monkeypatch.setattr(scraper.requests, "get", get)
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    monkeypatch.setattr(scraper, "current_kube_version", lambda: "1.36")
    with pytest.raises(requests.HTTPError):
        scraper.scrape()
    get.assert_called_once_with(scraper.INDEX_URL, timeout=30)
    update.assert_not_called()


def test_static_metadata_matches_published_recent_chart_mapping():
    root = COMPATIBILITY.parents[1]
    addon = yaml.safe_load((root / "static/compatibilities/goldilocks.yaml").read_text())
    versions = {row["version"]: row for row in addon["versions"]}
    assert versions["4.16.1"]["chart_version"] == "11.1.0"
    assert versions["4.14.1"]["chart_version"] == "10.6.0"
    assert versions["4.13.0"]["chart_version"] == "9.0.1"
    assert all(row["kube"] == [f"1.{minor}" for minor in range(36, 21, -1)] for row in versions.values())
