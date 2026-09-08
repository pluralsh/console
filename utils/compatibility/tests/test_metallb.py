import importlib.util
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("metallb", ROOT / "scrapers/metallb.py")
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def index(*entries):
    return yaml.safe_dump({"entries": {"metallb": list(entries)}})


def chart(app="v0.16.1", version="0.16.1", **kwargs):
    return {"appVersion": app, "version": version, "kubeVersion": ">= 1.19.0-0", **kwargs}


def test_release_fixture():
    content = (ROOT / "tests/fixtures/metallb-index.yaml").read_text()
    rows = scraper.extract_rows(content, "1.36")
    assert rows[0]["version"] == "0.16.1"
    assert rows[0]["chart_version"] == "0.16.1"
    assert len(rows) == 18
    assert all(row["kube"] == [f"1.{n}" for n in range(36, 18, -1)] for row in rows)


def test_no_speculation_for_legacy_or_prerelease():
    rows = scraper.extract_rows(index(chart(), chart(app="v0.17.0-rc1"),
        chart(app="v0.18.0", version="0.18.0-rc1"), chart(version="0.0.0"),
        {"appVersion": "v0.11.0", "version": "0.11.0"}), "1.20")
    assert [r["version"] for r in rows] == ["0.16.1"]
    assert rows[0]["kube"] == ["1.20", "1.19"]


def test_latest_chart_is_selected_numerically_independent_of_index_order():
    rows = scraper.extract_rows(index(chart(version="0.9.0"), chart(version="0.10.0")), "1.19")
    assert rows[0]["chart_version"] == "0.10.0"
    assert rows[0]["kube"] == ["1.19"]


@pytest.mark.parametrize("constraint", [">=1.19.1", ">=1.19.0 <1.30.0", ">1.19.0", "garbage", 1.19])
def test_rejects_unmodeled_constraints(constraint):
    with pytest.raises(ValueError):
        scraper.extract_rows(index(chart(kubeVersion=constraint)), "1.36")


@pytest.mark.parametrize("content,ceiling", [("[]", "1.36"), ("{}", "1.36"),
    (index(), "1.36"), (index(None), "1.36"), (index(chart()), "1.18"),
    (index(chart()), "1.36.1"), (index(chart()), None)])
def test_rejects_invalid_sources_or_ceiling(content, ceiling):
    with pytest.raises(ValueError):
        scraper.extract_rows(content, ceiling)


def test_http_failure_does_not_write(monkeypatch):
    response = Mock()
    response.raise_for_status.side_effect = requests.HTTPError("503")
    monkeypatch.setattr(scraper.requests, "get", Mock(return_value=response))
    writer = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", writer)
    with pytest.raises(requests.HTTPError):
        scraper.scrape()
    writer.assert_not_called()


def test_bad_later_row_does_not_partially_write(monkeypatch):
    response = Mock(content=index(chart(), chart(app="v0.16.0", kubeVersion="unknown")))
    monkeypatch.setattr(scraper.requests, "get", Mock(return_value=response))
    monkeypatch.setattr(scraper, "current_kube_version", lambda: "1.36")
    writer = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", writer)
    with pytest.raises(ValueError):
        scraper.scrape()
    writer.assert_not_called()
