import importlib.util
from pathlib import Path
import sys
from unittest.mock import Mock

import pytest
import requests
import yaml

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "trivy_operator_scraper", COMPATIBILITY / "scrapers" / "trivy-operator.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(version):
    return (FIXTURES / f"trivy-operator-v{version}-build.yaml").read_bytes()


def index(*charts):
    return yaml.safe_dump({"entries": {"trivy-operator": list(charts)}})


def chart(app, version):
    return {"appVersion": app, "version": version}


def workflow(images, *, env=None, job_env=None, step_env=None):
    return yaml.safe_dump({
        "env": env or {},
        "jobs": {"test": {
            "env": job_env or {},
            "steps": [{"uses": "engineerd/setup-kind@v0.6.2",
                       "env": step_env or {}, "with": {"image": image}}
                      for image in images],
        }},
    })


@pytest.mark.parametrize("version,expected", [
    ("0.0.8", ["1.21"]),
    ("0.23.0", ["1.31"]),
    ("0.30.0", ["1.33", "1.31"]),
    ("0.30.1", ["1.34", "1.31"]),
])
def test_exact_release_workflows(version, expected):
    assert scraper.parse_kube_versions(fixture(version)) == expected


def test_latest_chart_per_exact_application_and_numeric_sorting():
    data = index(chart("v0.22.0", "0.24.0"), chart("0.22.0", "0.24.1"),
                 chart("0.9.0", "0.9.1"), chart("0.22.0", "0.24.0"))
    assert list(scraper.stable_charts(data).items()) == [
        ("0.22.0", "0.24.1"), ("0.9.0", "0.9.1"),
    ]


@pytest.mark.parametrize("app,version", [
    ("0.30.0-rc.1", "0.32.0"), ("0.30.0", "0.32.0-rc.1"),
    ("latest", "0.32.0"), ("0.30", "0.32.0"), (0.30, "0.32.0"),
    (None, "0.32.0"), ("0.30.0", None), ("00.30.0", "0.32.0"),
])
def test_does_not_coerce_invalid_or_prerelease_versions(app, version):
    data = index(chart(app, version), chart("0.23.0", "0.25.0"))
    assert scraper.stable_charts(data) == {"0.23.0": "0.25.0"}


@pytest.mark.parametrize("content", [
    "", "[]", "entries: []", "entries: {}",
    "entries: {trivy-operator: []}", "entries: {trivy-operator: [null]}",
    "entries: {trivy-operator: [{version: main}]}",
])
def test_bad_index_cannot_empty_the_catalog(content):
    with pytest.raises(ValueError):
        scraper.stable_charts(content)


def test_uses_effective_environment_instead_of_unused_global_image():
    data = workflow(["${{ env.KIND_IMAGE }}"],
                    env={"KIND_IMAGE": "kindest/node:v1.21.1"},
                    job_env={"KIND_IMAGE": "kindest/node:v1.30.0"},
                    step_env={"KIND_IMAGE": "kindest/node:v1.34.0"})
    assert scraper.parse_kube_versions(data) == ["1.34"]


def test_job_environment_overrides_global_environment():
    data = workflow(["${{env.KIND_IMAGE}}"],
                    env={"KIND_IMAGE": "kindest/node:v1.21.1"},
                    job_env={"KIND_IMAGE": "kindest/node:v1.30.0"})
    assert scraper.parse_kube_versions(data) == ["1.30"]


def test_deduplicates_and_does_not_fill_gaps_or_extend_to_current_kubernetes():
    data = workflow(["kindest/node:v1.9.0", "kindest/node:v1.31.0", "kindest/node:v1.31.2"])
    assert scraper.parse_kube_versions(data) == ["1.31", "1.9"]


@pytest.mark.parametrize("image", [
    "${{ matrix.image }}", "${{ env.MISSING }}", "kindest/node:latest",
    "kindest/node:v1.34.0-rc.1", "kindest/node:v1.34", None, 1.34,
    "kindest/node:v1.34.0@sha256:bad", "other/image:v1.34.0",
])
def test_unknown_cluster_images_are_not_silently_dropped(image):
    with pytest.raises(ValueError, match="KIND image"):
        scraper.parse_kube_versions(workflow(["kindest/node:v1.31.0", image]))


@pytest.mark.parametrize("content", [
    "", "[]", "jobs: []", "jobs: {test: null}",
    "jobs: {test: {steps: [null]}}", "jobs: {test: {steps: null}}",
    "env: []\njobs: {test: {steps: []}}",
    "env: {KIND_IMAGE: 'kindest/node:v1.21.1'}\njobs: {test: {steps: []}}",
])
def test_workflow_shape_changes_fail_closed(content):
    with pytest.raises(ValueError):
        scraper.parse_kube_versions(content)


def test_build_rows_keeps_patch_level_compatibility_changes():
    fetch = Mock(side_effect=[fixture("0.30.1"), fixture("0.30.0")])
    rows = scraper.build_rows(index(chart("0.30.0", "0.32.0"), chart("0.30.1", "0.32.1")), fetch)
    assert [(row["version"], row["kube"], row["chart_version"]) for row in rows] == [
        ("0.30.1", ["1.34", "1.31"], "0.32.1"),
        ("0.30.0", ["1.33", "1.31"], "0.32.0"),
    ]
    assert [call.args[0] for call in fetch.call_args_list] == [
        scraper.WORKFLOW_URL.format(version="0.30.1"),
        scraper.WORKFLOW_URL.format(version="0.30.0"),
    ]


def test_missing_tag_does_not_reuse_another_release():
    with pytest.raises(ValueError, match="Missing Trivy Operator"):
        scraper.build_rows(index(chart("0.30.0", "0.32.0")), lambda _: None)


@pytest.mark.parametrize("failure", [requests.HTTPError("404"), requests.Timeout("timeout"), None])
def test_fetch_or_parse_failure_prevents_any_write(monkeypatch, failure):
    import utils

    session = Mock()
    session.__enter__ = Mock(return_value=session)
    session.__exit__ = Mock(return_value=False)
    first = Mock(content=index(chart("0.30.1", "0.32.1"), chart("0.30.0", "0.32.0")))
    second = Mock(content=fixture("0.30.1"))
    third = Mock(content=b"jobs: {}")
    if failure:
        third.raise_for_status.side_effect = failure
    session.get.side_effect = [first, second, third]
    monkeypatch.setattr(scraper.requests, "Session", Mock(return_value=session))
    writer = Mock()
    monkeypatch.setattr(utils, "update_compatibility_info", writer)
    with pytest.raises((ValueError, requests.RequestException)):
        scraper.scrape()
    writer.assert_not_called()
    assert all(call.kwargs == {"timeout": 30} for call in session.get.call_args_list)


def test_common_writer_preserves_metadata_history_and_patch_changes(tmp_path, monkeypatch):
    import utils

    target = tmp_path / "trivy-operator.yaml"
    target.write_text(yaml.safe_dump({
        "icon": "https://example.test/logo.png", "helm_repository_url": "https://example.test/charts/",
        "versions": [{"version": "0.23.0", "kube": ["1.31"], "chart_version": "0.25.0"}],
    }))
    monkeypatch.setattr(utils, "get_chart_images", lambda *args: ["example/operator:stable"])
    monkeypatch.setattr(utils, "summarization_enabled", lambda: False)
    fetch = lambda url: fixture(url.split("/v")[1].split("/")[0])
    rows = scraper.build_rows(index(chart("0.30.0", "0.32.0"), chart("0.30.1", "0.32.1")), fetch)
    utils.update_compatibility_info(str(target), rows)
    first = target.read_bytes()
    utils.update_compatibility_info(str(target), rows)
    assert target.read_bytes() == first
    output = yaml.safe_load(first)
    assert output["icon"] == "https://example.test/logo.png"
    assert [(row["version"], row["kube"]) for row in output["versions"]] == [
        ("0.30.1", ["1.34", "1.31"]), ("0.30.0", ["1.33", "1.31"]), ("0.23.0", ["1.31"]),
    ]
