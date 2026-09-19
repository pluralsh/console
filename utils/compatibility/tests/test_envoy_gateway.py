import importlib.util
import json
import sys
import types
from pathlib import Path
from unittest.mock import Mock

import pytest
import yaml

HERE = Path(__file__).resolve()
COMPATIBILITY = HERE.parents[1]
FIXTURES = HERE.parent / "fixtures"
ROOT = HERE.parents[3]

fake_utils = types.ModuleType("utils")
fake_utils.fetch_page = Mock()
fake_utils.update_compatibility_info = Mock()
sys.modules.setdefault("utils", fake_utils)

spec = importlib.util.spec_from_file_location(
    "envoy_gateway_scraper", COMPATIBILITY / "scrapers" / "envoy-gateway.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


def matrix_fixture():
    return (FIXTURES / "envoy-gateway-matrix.md").read_text()


def releases_fixture():
    return (FIXTURES / "envoy-gateway-releases.json").read_text()


def test_parse_matrix_uses_only_explicit_tested_kubernetes_versions():
    matrix = scraper.parse_compatibility_matrix(matrix_fixture())
    assert list(matrix) == ["1.9", "1.8", "0.2"]
    assert matrix["1.9"] == {
        "kube": ["1.33", "1.34", "1.35", "1.36"],
        "eolAt": "2027-02-14",
    }
    assert matrix["0.2"]["kube"] == ["1.24"]


def test_parse_matrix_rejects_missing_table():
    with pytest.raises(ValueError, match="table not found"):
        scraper.parse_compatibility_matrix("# nothing here")


def test_parse_matrix_rejects_malformed_kube_token():
    content = matrix_fixture().replace("v1.33, v1.34", "v1.33 - v1.34", 1)
    with pytest.raises(ValueError, match="Invalid Kubernetes version"):
        scraper.parse_compatibility_matrix(content)


def test_parse_matrix_rejects_bad_eol_date():
    content = matrix_fixture().replace("2027/02/14", "14-02-2027")
    with pytest.raises(ValueError, match="Invalid Envoy Gateway EOL date"):
        scraper.parse_compatibility_matrix(content)


def test_parse_releases_filters_prerelease_and_non_semver_tags():
    assert scraper.parse_releases(releases_fixture()) == [
        "1.9.1",
        "1.9.0",
        "1.8.4",
        "0.2.0",
    ]


def test_parse_releases_rejects_non_list_payload():
    with pytest.raises(ValueError, match="not a list"):
        scraper.parse_releases('{"message":"rate limited"}')


def test_latest_patch_selected_per_documented_minor():
    latest = scraper.latest_patch_by_minor(
        ["1.8.3", "1.9.0", "1.9.1", "0.2.0", "1.8.4"]
    )
    assert latest == {"1.9": "1.9.1", "1.8": "1.8.4", "0.2": "0.2.0"}


def test_build_rows_joins_matrix_to_latest_stable_patch_without_expansion():
    matrix = scraper.parse_compatibility_matrix(matrix_fixture())
    rows = scraper.build_rows(
        matrix, ["1.9.0", "1.9.1", "1.8.4", "0.2.0"]
    )
    assert rows[0] == {
        "version": "1.9.1",
        "kube": ["1.33", "1.34", "1.35", "1.36"],
        "requirements": [],
        "incompatibilities": [],
        "chart_version": "v1.9.1",
        "eolAt": "2027-02-14",
    }
    assert rows[-1]["version"] == "0.2.0"
    assert rows[-1]["kube"] == ["1.24"]


def test_build_rows_fails_closed_when_matrix_family_has_no_release():
    matrix = scraper.parse_compatibility_matrix(matrix_fixture())
    with pytest.raises(ValueError, match="matrix families: 1.8, 0.2"):
        scraper.build_rows(matrix, ["1.9.1"])


def test_fetch_stable_releases_paginates_and_sorts(monkeypatch):
    first = [
        {"tag_name": f"v1.9.{n}", "draft": False, "prerelease": False}
        for n in range(100)
    ]
    second = [{"tag_name": "v1.8.4", "draft": False, "prerelease": False}]
    fetch = Mock(side_effect=[json.dumps(first), json.dumps(second)])
    monkeypatch.setattr(scraper, "fetch_page", fetch)
    releases = scraper.fetch_stable_releases()
    assert releases[0] == "1.9.99"
    assert "1.8.4" in releases
    assert [call.args[0] for call in fetch.call_args_list] == [
        scraper.RELEASES_URL + "?per_page=100&page=1",
        scraper.RELEASES_URL + "?per_page=100&page=2",
    ]


def test_fetch_stable_releases_fails_on_fetch_error(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _: None)
    with pytest.raises(ValueError, match="Failed to fetch"):
        scraper.fetch_stable_releases()


def test_scrape_updates_only_after_both_sources_validate(monkeypatch):
    monkeypatch.setattr(
        scraper,
        "fetch_page",
        lambda url: matrix_fixture() if url == scraper.MATRIX_URL else releases_fixture(),
    )
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    scraper.scrape()
    path, rows = update.call_args.args
    assert path == "../../static/compatibilities/envoy-gateway.yaml"
    assert rows[0]["version"] == "1.9.1"
    assert rows[0]["chart_version"] == "v1.9.1"


def test_scrape_does_not_write_on_invalid_matrix(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _: "broken")
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    with pytest.raises(ValueError):
        scraper.scrape()
    update.assert_not_called()


def test_static_catalog_metadata_and_manifest_registration():
    addon = yaml.safe_load(
        (ROOT / "static" / "compatibilities" / "envoy-gateway.yaml").read_text()
    )
    assert addon["git_url"] == "https://github.com/envoyproxy/gateway"
    assert addon["helm_repository_url"] == "oci://docker.io/envoyproxy/gateway-helm"
    assert addon["chart_name"] == "gateway-helm"
    manifest = yaml.safe_load(
        (ROOT / "static" / "compatibilities" / "manifest.yaml").read_text()
    )
    assert manifest["names"].count("envoy-gateway") == 1


def test_static_rows_match_authoritative_matrix_and_latest_release_mapping():
    addon = yaml.safe_load(
        (ROOT / "static" / "compatibilities" / "envoy-gateway.yaml").read_text()
    )
    rows = {row["version"]: row for row in addon["versions"]}
    assert rows["1.9.1"]["kube"] == ["1.36", "1.35", "1.34", "1.33"]
    assert rows["1.9.1"]["chart_version"] == "v1.9.1"
    assert rows["1.9.1"]["eolAt"] == "2027-02-14"
    assert rows["1.8.4"]["kube"] == ["1.35", "1.34", "1.33", "1.32"]
    assert rows["0.2.0"]["kube"] == ["1.24"]
