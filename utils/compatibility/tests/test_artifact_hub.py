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
    "artifact_hub_scraper", COMPATIBILITY / "scrapers" / "artifact-hub.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURE = Path(__file__).parent / "fixtures" / "artifact-hub-index.yaml"


def chart(version="1.23.0", app_version="1.23.0", constraint=">= 1.19.0-0"):
    return {"version": version, "appVersion": app_version, "kubeVersion": constraint}


def index(*entries):
    return yaml.safe_dump({"entries": {"artifact-hub": list(entries)}})


def test_official_index_retains_both_historical_floors_and_omits_unknown_legacy():
    rows = scraper.build_rows(FIXTURE.read_text(), "1.36")
    by_version = {row["version"]: row for row in rows}
    assert len(rows) == 29
    assert rows[0]["version"] == "1.23.0"
    assert rows[-1]["version"] == "0.17.0"
    assert by_version["1.23.0"]["kube"] == [f"1.{n}" for n in range(36, 18, -1)]
    assert by_version["1.3.0"]["kube"] == [f"1.{n}" for n in range(36, 13, -1)]
    assert "0.16.0" not in by_version


def test_same_floor_as_cap_has_no_extra_minor():
    assert scraper.build_rows(index(chart()), "1.19")[0]["kube"] == ["1.19"]


def test_duplicate_app_uses_highest_stable_chart_independent_of_order():
    entries = [chart("1.23.1"), chart(), chart("1.23.10"), chart("1.24.0-rc.1")]
    forward = scraper.build_rows(index(*entries), "1.36")
    assert forward == scraper.build_rows(index(*reversed(entries)), "1.36")
    assert len(forward) == 1
    assert forward[0]["chart_version"] == "1.23.10"


def test_prerelease_app_does_not_override_stable_row():
    rows = scraper.build_rows(index(chart(), chart("1.24.0", "1.24.0-rc.1")), "1.36")
    assert [row["version"] for row in rows] == ["1.23.0"]


def test_conflicting_duplicate_chart_rejected():
    with pytest.raises(ValueError, match="Conflicting"):
        scraper.build_rows(index(chart(), chart(constraint=">= 1.20.0-0")), "1.36")


@pytest.mark.parametrize("constraint", [
    None, "", 1.19, ">=1.19.1", "^1.19.0", ">=1.19.0 <1.30.0",
    ">=1.19.0 || >=2.0.0", ">=1.19.0-rc.1", ">=2.0.0", ">=1.019.0",
])
def test_unsupported_constraint_rejected(constraint):
    with pytest.raises(ValueError, match="constraint"):
        scraper.build_rows(index(chart(constraint=constraint)), "1.36")


@pytest.mark.parametrize("cap", [None, "", "2.0", "1.36.0", "1.18", "1.036"])
def test_invalid_or_lower_cap_rejected(cap):
    with pytest.raises(ValueError):
        scraper.build_rows(index(chart()), cap)


@pytest.mark.parametrize("content", [
    "", "[]", "entries: []", "entries: {}", index(), index(None), index({}),
    index(chart(version=1.23)), index(chart(app_version="invalid")),
    index(chart(version="1.24.0-rc.1")), "entries: [",
])
def test_empty_malformed_or_no_stable_candidates_rejected(content):
    with pytest.raises((ValueError, yaml.YAMLError)):
        scraper.build_rows(content, "1.36")


def test_missing_new_constraint_does_not_use_an_older_chart():
    with pytest.raises(ValueError, match="constraint"):
        scraper.build_rows(index(chart(), chart("1.23.1", constraint=None)), "1.36")


def test_scrape_fetches_with_timeout_and_passes_complete_rows(monkeypatch):
    response = Mock(text=FIXTURE.read_text())
    get = Mock(return_value=response)
    update = Mock()
    monkeypatch.setattr(scraper.requests, "get", get)
    monkeypatch.setattr(scraper, "current_kube_version", lambda: "1.36")
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    scraper.scrape()
    get.assert_called_once_with(scraper.INDEX_URL, timeout=30)
    response.raise_for_status.assert_called_once_with()
    assert len(update.call_args.args[1]) == 29


@pytest.mark.parametrize("failure", ["http", "timeout", "yaml", "constraint"])
def test_scrape_failure_never_reaches_writer(monkeypatch, failure):
    response = Mock(text=FIXTURE.read_text())
    get = Mock(return_value=response)
    if failure == "http":
        response.raise_for_status.side_effect = requests.HTTPError("503")
    elif failure == "timeout":
        get.side_effect = requests.Timeout("timeout")
    elif failure == "yaml":
        response.text = "entries: ["
    else:
        response.text = index(chart(), chart("1.24.0", "1.24.0", "^1.20.0"))
    update = Mock()
    monkeypatch.setattr(scraper.requests, "get", get)
    monkeypatch.setattr(scraper, "current_kube_version", lambda: "1.36")
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    with pytest.raises((requests.RequestException, ValueError, yaml.YAMLError)):
        scraper.scrape()
    update.assert_not_called()


def test_real_update_preserves_metadata_and_serializes_rows(tmp_path, monkeypatch):
    import utils

    target = tmp_path / "artifact-hub.yaml"
    target.write_text(yaml.safe_dump({
        "git_url": "https://github.com/artifacthub/hub",
        "helm_repository_url": "https://artifacthub.github.io/helm-charts",
        "chart_name": "artifact-hub",
        "versions": [],
    }))
    monkeypatch.setattr(utils, "summarization_enabled", lambda: False)
    images = Mock(return_value=[])
    monkeypatch.setattr(utils, "get_chart_images", images)
    rows = scraper.build_rows(FIXTURE.read_text(), "1.36")
    utils.update_compatibility_info(str(target), rows)
    saved = yaml.safe_load(target.read_text())
    assert saved["git_url"] == "https://github.com/artifacthub/hub"
    assert saved["chart_name"] == "artifact-hub"
    assert saved["versions"] == [dict(row) for row in utils.reduce_versions(rows)]
    assert saved["versions"][0]["kube"][-1] == "1.19"
    assert images.call_count == len(saved["versions"])


def test_static_table_and_aggregate_match_source():
    import utils

    root = COMPATIBILITY.parents[1]
    addon = yaml.safe_load((root / "static/compatibilities/artifact-hub.yaml").read_text())
    cap = (root / "KUBE_VERSION").read_text().strip()
    expected = utils.reduce_versions(scraper.build_rows(FIXTURE.read_text(), cap))
    assert addon["versions"] == [dict(row) for row in expected]
    aggregate = yaml.safe_load((root / "static/compatibilities.yaml").read_text())
    assert [row for row in aggregate["addons"] if row["name"] == "artifact-hub"] == [
        {**addon, "name": "artifact-hub"}
    ]
    manifest = yaml.safe_load((root / "static/compatibilities/manifest.yaml").read_text())
    assert manifest["names"].count("artifact-hub") == 1
