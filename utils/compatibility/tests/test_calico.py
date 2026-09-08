"""Offline Calico family matrix parsing, source failure handling, and writer-boundary regressions."""

import importlib
import shutil
import sys
from copy import deepcopy
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests
import yaml

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
import utils  # noqa: E402

scraper = importlib.import_module("scrapers.calico")
FIXTURES = Path(__file__).parent / "fixtures"
ROOT = COMPATIBILITY.parents[1]
CALICO_YAML = ROOT / "static/compatibilities/calico.yaml"
REQUIREMENTS = scraper.requirements_path
PARTIAL = "_includes/partials/_system-requirements.mdx"
SENTENCE = "We test $[prodname] $[version] against the following Kubernetes versions. Other versions may work."


def fixture(name):
    return (FIXTURES / f"calico-{name}").read_text()


def url(ref, family, path):
    return scraper.docs_url.format(ref=ref, family=family, path=path)


# Upstream layouts: 3.32 on main imports the shared partial, 3.28 on its archive branch is inline.
SOURCES = {
    url("main", "3.32", "variables.js"): fixture("v3.32-variables.js"),
    url("main", "3.32", REQUIREMENTS): fixture("v3.32-requirements.mdx"),
    url("main", "3.32", PARTIAL): fixture("v3.32-system-requirements.mdx"),
    url("archive-os-3.28", "3.28", "variables.js"): fixture("v3.28-variables.js"),
    url("archive-os-3.28", "3.28", REQUIREMENTS): fixture("v3.28-requirements.mdx"),
}


def response(text="", status=200):
    result = Mock(text=text, status_code=status)
    result.raise_for_status.side_effect = requests.HTTPError(str(status)) if status >= 400 else None
    return result


def mock_sources(monkeypatch, sources=SOURCES):
    """Serve fixture bodies by URL; ints are HTTP failures and unknown URLs are 404."""
    calls = []

    def get(requested, timeout=None):
        calls.append((requested, timeout))
        body = sources.get(requested)
        if body is None:
            return response(status=404)
        if isinstance(body, int):
            return response(status=body)
        return response(text=body)

    monkeypatch.setattr(scraper.requests, "get", get)
    return calls


def mock_writer_boundary(monkeypatch, releases, charts):
    """Run the real utils writer with no Helm rendering, no summarizer, and no GitHub/Helm index."""
    monkeypatch.setattr(scraper, "get_github_releases", lambda owner, repo: releases)
    monkeypatch.setattr(scraper, "get_chart_versions", lambda app, chart="": charts)
    monkeypatch.setattr(utils, "get_chart_images", lambda *args, **kwargs: None)
    monkeypatch.setattr(utils, "summarization_enabled", lambda: False)


def row(version, **extra):
    base = {"version": version, "kube": ["1.30"], "requirements": [{"name": "kept", "version": "1.0.0"}],
            "incompatibilities": [], "summary": {"helm_changes": "kept"}, "chart_version": version,
            "images": ["quay.io/tigera/operator:v1.0.0"], "eolAt": "2030-01-01"}
    return {**base, **extra}


@pytest.mark.parametrize("name,expected", [
    ("v3.32-system-requirements.mdx", ["1.36", "1.35", "1.34"]),
    ("v3.28-requirements.mdx", ["1.30", "1.29", "1.28", "1.27"]),
])
def test_family_sources_map_to_different_matrices(name, expected):
    assert scraper.parse_kube_versions(fixture(name)) == expected


def test_matrix_deduplicates_without_inventing_untested_minors():
    content = f"{SENTENCE}\n\n- v1.29\n* 1.31\n- v1.29\n\nDue to changes in the Kubernetes API"
    assert scraper.parse_kube_versions(content) == ["1.31", "1.29"]


@pytest.mark.parametrize("content", [
    "", "## Kubernetes requirements\n\n- v1.30\n", f"{SENTENCE}\n\nDue to changes",
    f"{SENTENCE}\n\n- v1.30\n\n{SENTENCE}\n\n- v1.31\n",
    f"{SENTENCE}\n\n- v1.30 (beta)\n", f"{SENTENCE}\n\n- 1.30.1\n", f"{SENTENCE}\n\n- v1.30\n- v1.31 and later\n",
])
def test_rejects_missing_or_malformed_matrix(content):
    with pytest.raises(ValueError):
        scraper.parse_kube_versions(content)


@pytest.mark.parametrize("name,expected", [("v3.32-variables.js", "v3.32"), ("v3.28-variables.js", "v3.28")])
def test_docs_version_variable(name, expected):
    assert scraper.parse_docs_version(fixture(name)) == expected


@pytest.mark.parametrize("content", ["", "releaseTitle: 'v3.32.2',", "version: 'v3.32',\nversion: 'v3.31',"])
def test_rejects_missing_or_ambiguous_docs_version(content):
    with pytest.raises(ValueError):
        scraper.parse_docs_version(content)


def test_current_family_follows_partial_import_from_main(monkeypatch):
    calls = mock_sources(monkeypatch)
    assert scraper.family_kube_versions("3.32") == ["1.36", "1.35", "1.34"]
    assert calls == [(url("main", "3.32", path), 30) for path in ("variables.js", REQUIREMENTS, PARTIAL)]


def test_archived_family_is_read_from_its_archive_branch(monkeypatch):
    calls = mock_sources(monkeypatch)
    assert scraper.family_kube_versions("3.28") == ["1.30", "1.29", "1.28", "1.27"]
    assert [call[0] for call in calls] == [
        url("main", "3.28", "variables.js"),
        url("archive-os-3.28", "3.28", "variables.js"),
        url("archive-os-3.28", "3.28", REQUIREMENTS),
    ]


def test_unpublished_family_is_none_after_probing_every_ref(monkeypatch):
    calls = mock_sources(monkeypatch)
    assert scraper.family_kube_versions("3.23") is None
    assert [call[0] for call in calls] == [
        url(ref, "3.23", "variables.js") for ref in ("main", "archive-os-3.23", "archive-oss-3.23")
    ]


@pytest.mark.parametrize("overrides,error,match", [
    ({url("main", "3.32", "variables.js"): fixture("v3.32-variables.js").replace("'v3.32'", "'v3.31'")},
     ValueError, "describe v3.31"),
    ({url("main", "3.32", "variables.js"): 500}, requests.HTTPError, "500"),
    ({url("main", "3.32", REQUIREMENTS): None}, ValueError, "missing"),
    ({url("main", "3.32", PARTIAL): None}, ValueError, "missing"),
    ({url("main", "3.32", PARTIAL): 503}, requests.HTTPError, "503"),
    ({url("main", "3.32", PARTIAL): "## Kubernetes requirements\n"}, ValueError, "not found"),
    ({url("main", "3.32", PARTIAL): f"{SENTENCE}\n\n- v1.34 or later\n"}, ValueError, "Invalid"),
])
def test_mismatched_failed_or_malformed_family_source_raises(monkeypatch, overrides, error, match):
    mock_sources(monkeypatch, {**SOURCES, **overrides})
    with pytest.raises(error, match=match):
        scraper.family_kube_versions("3.32")


def test_candidates_are_stored_rows_plus_chart_backed_stable_releases():
    existing = [row("3.31.0"), row("3.20.6", chart_version=None), {"version": 3.3}]
    releases = ["v3.32.2", "v3.32.0-rc1", "v3.31.0", "v3.30.7", "master"]
    charts = {"3.32.2": "3.32.2", "3.32.0-rc1": "3.32.0-rc1", "3.31.0": "3.31.1"}
    assert scraper.candidate_versions(existing, releases, charts) == {
        "3.31.0": "3.31.1", "3.32.2": "3.32.2",
    }


def test_rows_copy_stored_metadata_and_skip_unpublished_families():
    existing = [row("3.32.0"), row("3.28.0"), row("3.23.4")]
    before = deepcopy(existing)
    matrices = {"3.32": ["1.36", "1.35", "1.34"], "3.28": ["1.30", "1.29", "1.28", "1.27"], "3.23": None}
    seen = []
    candidates = {"3.32.2": "3.32.2", "3.32.0": "3.32.0", "3.28.0": "3.28.0", "3.23.4": "3.23.4"}
    rows = scraper.build_rows(existing, candidates, lambda family: (seen.append(family), matrices[family])[1])
    assert seen == ["3.32", "3.28", "3.23"]
    assert [r["version"] for r in rows] == ["3.32.2", "3.32.0", "3.28.0"]
    assert rows[0] == {"version": "3.32.2", "kube": matrices["3.32"], "chart_version": "3.32.2",
                       "images": [], "requirements": [], "incompatibilities": []}
    assert rows[1] == {**row("3.32.0"), "kube": matrices["3.32"]}
    assert rows[2] == {**row("3.28.0"), "kube": matrices["3.28"]}
    assert existing == before


def test_writer_boundary_updates_only_sourced_families_and_is_idempotent(monkeypatch, tmp_path):
    table = tmp_path / "calico.yaml"
    shutil.copy(CALICO_YAML, table)
    # Reproduce the old scraper's stale matrix before exercising the real writer.
    stale = yaml.safe_load(table.read_text())
    for entry in stale["versions"]:
        if entry["version"].startswith("3.32."):
            entry["kube"] = ["1.30", "1.29", "1.28", "1.27"]
    utils.write_yaml(str(table), stale)
    assert table.read_text() != CALICO_YAML.read_text()
    before = {r["version"]: r for r in yaml.safe_load(table.read_text())["versions"]}
    mock_sources(monkeypatch)
    mock_writer_boundary(monkeypatch, ["v3.32.2", "v3.32.0-rc1", "v3.28.0"], {"3.32.2": "3.32.2", "3.28.0": "3.28.0"})

    scraper.do_scrape("calico", str(table))
    written = table.read_text()
    after = {r["version"]: r for r in yaml.safe_load(written)["versions"]}

    assert set(after) == set(before)
    for version, entry in after.items():
        family = version.rsplit(".", 1)[0]
        expected = {"3.32": ["1.36", "1.35", "1.34"], "3.28": ["1.30", "1.29", "1.28", "1.27"]}.get(family)
        assert entry["kube"] == (expected or before[version]["kube"]), version
        assert {k: v for k, v in entry.items() if k != "kube"} == {k: v for k, v in before[version].items() if k != "kube"}
    assert written == CALICO_YAML.read_text()

    scraper.do_scrape("calico", str(table))
    assert table.read_text() == written


@pytest.mark.parametrize("overrides", [
    {url("main", "3.32", PARTIAL): "## Kubernetes requirements\n"},
    {url("main", "3.32", PARTIAL): 500},
    {url("main", "3.32", "variables.js"): fixture("v3.32-variables.js").replace("'v3.32'", "'v3.31'")},
])
def test_failed_family_source_leaves_table_untouched(monkeypatch, tmp_path, overrides):
    table = tmp_path / "calico.yaml"
    shutil.copy(CALICO_YAML, table)
    mock_sources(monkeypatch, {**SOURCES, **overrides})
    mock_writer_boundary(monkeypatch, ["v3.32.2", "v3.28.0"], {"3.32.2": "3.32.2", "3.28.0": "3.28.0"})
    with pytest.raises((ValueError, requests.HTTPError)):
        scraper.do_scrape("calico", str(table))
    assert table.read_text() == CALICO_YAML.read_text()


def test_no_published_family_does_not_write(monkeypatch, tmp_path):
    table = tmp_path / "calico.yaml"
    shutil.copy(CALICO_YAML, table)
    mock_sources(monkeypatch, {})
    mock_writer_boundary(monkeypatch, ["v3.32.2"], {"3.32.2": "3.32.2"})
    with pytest.raises(ValueError, match="No source-backed"):
        scraper.do_scrape("calico", str(table))
    assert table.read_text() == CALICO_YAML.read_text()


@pytest.mark.parametrize("content", [None, "[]", "versions: null"])
def test_invalid_table_does_not_fetch_or_write(monkeypatch, tmp_path, content):
    table = tmp_path / "calico.yaml"
    if content is not None:
        table.write_text(content)
    calls = mock_sources(monkeypatch)
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)
    mock_writer_boundary(monkeypatch, ["v3.32.2"], {"3.32.2": "3.32.2"})
    with pytest.raises(ValueError, match="Invalid compatibility table"):
        scraper.do_scrape("calico", str(table))
    assert calls == []
    update.assert_not_called()


def test_static_rows_match_family_sources_and_aggregate():
    addon = yaml.safe_load(CALICO_YAML.read_text())
    versions = {r["version"]: r for r in addon["versions"]}
    for version in ("3.32.2", "3.32.0"):
        assert versions[version]["kube"] == scraper.parse_kube_versions(fixture("v3.32-system-requirements.mdx"))
    assert versions["3.28.0"]["kube"] == scraper.parse_kube_versions(fixture("v3.28-requirements.mdx"))
    assert versions["3.32.2"]["chart_version"] == "3.32.2"
    assert versions["3.32.2"]["images"] == ["quay.io/tigera/operator:v1.42.6"]
    assert versions["3.28.0"]["eolAt"] == "2025-05-05"
    aggregate = yaml.safe_load((ROOT / "static/compatibilities.yaml").read_text())
    assert next(a for a in aggregate["addons"] if a["name"] == "calico") == {**addon, "name": "calico"}
