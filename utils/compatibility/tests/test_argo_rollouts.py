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
    "argo_rollouts_scraper", COMPATIBILITY / "scrapers" / "argo-rollouts.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(version):
    return (FIXTURES / f"argo-rollouts-v{version}-testing.yaml").read_text()


def response(*, body=None, text="", error=None):
    result = Mock(text=text)
    result.json.return_value = body
    result.raise_for_status.side_effect = error
    return result


@pytest.mark.parametrize("version,expected", [
    ("1.8.3", ["1.31", "1.30", "1.29", "1.28"]),
    ("1.9.0", ["1.34", "1.33", "1.32", "1.31"]),
    ("1.9.1", ["1.35", "1.34", "1.33", "1.32"]),
    ("1.10.0", ["1.35", "1.34", "1.33", "1.32"]),
])
def test_release_tag_matrix(version, expected):
    assert scraper.parse_kube_versions(fixture(version)) == expected


def test_matrix_deduplicates_without_inventing_untested_minors():
    content = yaml.safe_dump({"jobs": {"test-e2e": {"strategy": {"matrix": {
        "kubernetes": [{"version": "1.29"}, {"version": "1.31"}, {"version": "1.29"}]
    }}}}})
    assert scraper.parse_kube_versions(content) == ["1.31", "1.29"]


@pytest.mark.parametrize("content", [
    "", "[]", "jobs: []", "jobs: {test-e2e: {strategy: {matrix: {kubernetes: []}}}}",
    "jobs: {test-e2e: {strategy: {matrix: {kubernetes: [1.30]}}}}",
    "jobs: {test-e2e: {strategy: {matrix: {kubernetes: [{version: 1.30}]}}}}",
    'jobs: {test-e2e: {strategy: {matrix: {kubernetes: [{version: "1.35.1+k3s1"}]}}}}',
])
def test_rejects_missing_or_malformed_matrix(content):
    with pytest.raises(ValueError):
        scraper.parse_kube_versions(content)


def test_fetch_tags_paginates_and_uses_timeouts(monkeypatch):
    first = [{"name": f"v1.8.{patch}"} for patch in range(100)]
    get = Mock(side_effect=[response(body=first), response(body=[{"name": "v1.7.0"}])])
    monkeypatch.setattr(scraper.requests, "get", get)
    assert len(scraper.fetch_github_tags()) == 101
    assert [call.kwargs for call in get.call_args_list] == [
        {"params": {"per_page": 100, "page": 1}, "timeout": 30},
        {"params": {"per_page": 100, "page": 2}, "timeout": 30},
    ]


@pytest.mark.parametrize("body", [{"message": "error"}, [None], [{}], [{"name": 123}]])
def test_rejects_invalid_tag_response(monkeypatch, body):
    monkeypatch.setattr(scraper.requests, "get", Mock(return_value=response(body=body)))
    with pytest.raises(ValueError, match="tags response"):
        scraper.fetch_github_tags()


def test_rejects_repeated_tag_page(monkeypatch):
    page = [{"name": f"v1.8.{patch}"} for patch in range(100)]
    monkeypatch.setattr(scraper.requests, "get", Mock(return_value=response(body=page)))
    with pytest.raises(ValueError, match="did not advance"):
        scraper.fetch_github_tags()


def test_scrape_uses_exact_tag_for_183_and_skips_prereleases_and_legacy(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_github_tags", lambda: [
        "v1.10.0-rc1", "v1.10.0", "v1.8.3", "v1.7.0", "master", "v1.11.0",
    ])
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _: {
        "1.10.0-rc1": "2.43.0-rc1", "1.10.0": "2.43.0", "1.8.3": "2.40.5", "1.7.0": "2.36.0",
    })
    get = Mock(side_effect=[response(text=fixture("1.10.0")), response(text=fixture("1.8.3"))])
    monkeypatch.setattr(scraper.requests, "get", get)
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    scraper.scrape()
    assert [call.args[0] for call in get.call_args_list] == [
        scraper.workflow_url.format(tag="v1.10.0"),
        scraper.workflow_url.format(tag="v1.8.3"),
    ]
    assert all(call.kwargs == {"timeout": 30} for call in get.call_args_list)
    rows = update.call_args.args[1]
    assert rows[0]["version"] == "1.10.0"
    assert rows[0]["chart_version"] == "2.43.0"
    assert rows[1]["kube"] == ["1.31", "1.30", "1.29", "1.28"]


@pytest.mark.parametrize("failure", ["404", "503", "matrix"])
def test_failed_release_does_not_partially_write(monkeypatch, failure):
    failed = response(text="jobs: {}") if failure == "matrix" else response(error=requests.HTTPError(failure))
    monkeypatch.setattr(scraper, "fetch_github_tags", lambda: ["v1.10.0", "v1.9.0"])
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _: {"1.10.0": "2.43.0", "1.9.0": "2.41.0"})
    monkeypatch.setattr(scraper.requests, "get", Mock(side_effect=[response(text=fixture("1.10.0")), failed]))
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    with pytest.raises((requests.HTTPError, ValueError)):
        scraper.scrape()
    update.assert_not_called()


@pytest.mark.parametrize("tags,charts", [([], {}), (["v1.10.0"], {}), (["v1.10.0"], {"1.10.0": "2.43.0-rc1"})])
def test_no_valid_candidate_does_not_write(monkeypatch, tags, charts):
    monkeypatch.setattr(scraper, "fetch_github_tags", lambda: tags)
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _: charts)
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    with pytest.raises(ValueError):
        scraper.scrape()
    update.assert_not_called()


def test_static_rows_match_release_matrices_and_real_chart_versions():
    root = COMPATIBILITY.parents[1]
    addon = yaml.safe_load((root / "static/compatibilities/argo-rollouts.yaml").read_text())
    versions = {row["version"]: row for row in addon["versions"]}
    for version, chart in [("1.9.0", "2.41.0"), ("1.9.1", "2.42.0"), ("1.10.0", "2.43.0")]:
        assert versions[version]["kube"] == scraper.parse_kube_versions(fixture(version))
        assert versions[version]["chart_version"] == chart
        assert versions[version]["images"] == [f"quay.io/argoproj/argo-rollouts:v{version}"]
    aggregate = yaml.safe_load((root / "static/compatibilities.yaml").read_text())
    assert next(row for row in aggregate["addons"] if row["name"] == "argo-rollouts") == {**addon, "name": "argo-rollouts"}
