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
    "nats_scraper", COMPATIBILITY / "scrapers" / "nats.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(chart_version):
    return (FIXTURES / f"nats-{chart_version}-test.yaml").read_text()


def response(*, body=None, text="", status=200, error=None):
    result = Mock(status_code=status, text=text)
    result.json.return_value = body
    result.raise_for_status.side_effect = error
    return result


def chart(*, chart_version="2.14.6", app_version="2.14.6"):
    return yaml.safe_dump(
        {
            "apiVersion": "v2",
            "name": "nats",
            "version": chart_version,
            "appVersion": app_version,
        }
    )


def index(entries):
    return yaml.safe_dump({"apiVersion": "v1", "entries": {"nats": entries}})


def entry(chart_version, app_version, *, url_tag=None):
    url_tag = url_tag or f"nats-{chart_version}"
    return {
        "name": "nats",
        "version": chart_version,
        "appVersion": app_version,
        "urls": [
            f"https://github.com/nats-io/k8s/releases/download/{url_tag}/"
            f"nats-{chart_version}.tgz"
        ],
    }


@pytest.mark.parametrize(
    "value,expected",
    [
        ("2.14.6", "2.14.6"),
        ("v2.11.6", "2.11.6"),
        ("2.9.15-alpine", "2.9.15"),
    ],
)
def test_normalize_app_version(value, expected):
    assert scraper.normalize_app_version(value) == expected


@pytest.mark.parametrize("value", [None, 2.9, "latest", "2.14", "2.14.6-rc1", "2.14.6-slim"])
def test_normalize_app_version_rejects_nonstable_values(value):
    with pytest.raises(ValueError):
        scraper.normalize_app_version(value)


def test_chart_index_uses_evidence_floor_and_filters_prerelease_charts():
    content = index(
        [
            entry("2.14.6", "2.14.6"),
            entry("1.0.0-rc.1", "2.9.20"),
            entry("0.13.2", "2.7.3"),
            entry("0.13.1", "2.7.2", url_tag="v0.13.1"),
        ]
    )
    rows = scraper.parse_chart_index(content)
    assert [(row["chart_version"], row["app_version"]) for row in rows] == [
        ("2.14.6", "2.14.6"),
        ("0.13.2", "2.7.3"),
    ]


def test_chart_index_normalizes_old_alpine_app_versions():
    rows = scraper.parse_chart_index(index([entry("0.19.12", "2.9.15-alpine")]))
    assert rows[0]["app_version"] == "2.9.15"


@pytest.mark.parametrize(
    "content",
    [
        "",
        "[]",
        yaml.safe_dump({"entries": {}}),
        index([{"version": "0.13.2", "appVersion": "2.7.3", "urls": []}]),
        index([entry("0.13.2", "2.7.3", url_tag="wrong-tag")]),
        index([entry("0.13.2", "latest")]),
    ],
)
def test_chart_index_rejects_malformed_stable_entries(content):
    with pytest.raises(ValueError):
        scraper.parse_chart_index(content)


def test_select_latest_chart_per_application_version():
    candidates = scraper.parse_chart_index(
        index(
            [
                entry("1.3.0", "2.11.0"),
                entry("1.3.1", "2.11.0"),
                entry("0.19.17", "2.9.20"),
                entry("1.0.0", "2.9.20"),
                entry("0.18.0", "2.9.0"),
            ]
        )
    )
    selected = scraper.select_latest_chart_per_app(candidates)
    lookup = {row["app_version"]: row["chart_version"] for row in selected}
    assert lookup == {"2.11.0": "1.3.1", "2.9.20": "1.0.0", "2.9.0": "0.18.0"}


def test_parse_chart_keeps_application_and_chart_versions_distinct():
    expected = {"tag": "nats-1.3.9", "chart_version": "1.3.9", "app_version": "2.11.6"}
    app, chart_v = scraper.parse_chart(
        chart(chart_version="1.3.9", app_version="2.11.6"), expected
    )
    assert app == "2.11.6"
    assert chart_v == "1.3.9"


def test_parse_chart_normalizes_legacy_alpine_application_version():
    expected = {"tag": "nats-0.19.12", "chart_version": "0.19.12", "app_version": "2.9.15"}
    app, _ = scraper.parse_chart(
        chart(chart_version="0.19.12", app_version="2.9.15-alpine"), expected
    )
    assert app == "2.9.15"


@pytest.mark.parametrize(
    "content,expected",
    [
        (fixture("0.13.2"), ["1.23", "1.22", "1.21"]),
        (fixture("1.0.0"), ["1.26", "1.25", "1.24"]),
        (fixture("1.3.9"), ["1.32", "1.31", "1.30"]),
        (fixture("2.14.6"), ["1.32", "1.31", "1.30"]),
    ],
)
def test_release_tag_workflow_evidence(content, expected):
    assert scraper.parse_workflow(content) == expected


def test_workflow_deduplicates_without_inventing_untested_minors():
    data = yaml.safe_load(fixture("1.3.9"))
    data["jobs"]["lint-test"]["strategy"]["matrix"]["k8s"] = ["1.29", "1.31", "1.29"]
    assert scraper.parse_workflow(yaml.safe_dump(data)) == ["1.31", "1.29"]


def mutate_fixture(mutator):
    data = yaml.safe_load(fixture("1.3.9"))
    mutator(data)
    return yaml.safe_dump(data, sort_keys=False)


@pytest.mark.parametrize(
    "content",
    [
        "",
        "[]",
        "jobs: {}",
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["strategy"]["matrix"].update({"k8s": [1.30]})),
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["strategy"]["matrix"].update({"k8s": ["1.30.1"]})),
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["steps"].pop(0)),
        mutate_fixture(lambda d: d["jobs"]["lint-test"].update({"continue-on-error": True})),
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["steps"][-1].update({"continue-on-error": True})),
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["steps"][-1].update({"run": "ct install --chart-dirs helm/charts"})),
        mutate_fixture(lambda d: d["jobs"]["lint-test"]["steps"][-1].update({"run": "ct install --all --chart-dirs helm/charts --excluded-charts nats,nats-operator"})),
    ],
)
def test_workflow_rejects_missing_or_unreliable_evidence(content):
    with pytest.raises(ValueError):
        scraper.parse_workflow(content)


def test_fetch_candidates_uses_official_helm_index(monkeypatch):
    get = Mock(return_value=response(text=index([entry("0.13.2", "2.7.3")])))
    monkeypatch.setattr(scraper.requests, "get", get)
    assert scraper.fetch_candidates()[0]["tag"] == "nats-0.13.2"
    assert get.call_args.args == (scraper.chart_index_url,)
    assert get.call_args.kwargs == {"timeout": 30}


def test_scrape_validates_exact_tagged_chart_and_workflow_before_write(monkeypatch):
    monkeypatch.setattr(
        scraper,
        "fetch_candidates",
        lambda: [
            {"app_version": "2.11.0", "chart_version": "1.3.1", "tag": "nats-1.3.1"},
            {"app_version": "2.14.6", "chart_version": "2.14.6", "tag": "nats-2.14.6"},
        ],
    )
    get = Mock(
        side_effect=[
            response(text=chart(chart_version="1.3.1", app_version="2.11.0")),
            response(text=fixture("1.0.0")),
            response(text=chart()),
            response(text=fixture("2.14.6")),
        ]
    )
    monkeypatch.setattr(scraper.requests, "get", get)
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)

    scraper.scrape()

    rows = update.call_args.args[1]
    assert [(row["version"], row["chart_version"], row["kube"]) for row in rows] == [
        ("2.11.0", "1.3.1", ["1.26", "1.25", "1.24"]),
        ("2.14.6", "2.14.6", ["1.32", "1.31", "1.30"]),
    ]


@pytest.mark.parametrize("failure_index", [0, 1, 2, 3])
def test_source_failure_does_not_partially_write(monkeypatch, failure_index):
    monkeypatch.setattr(
        scraper,
        "fetch_candidates",
        lambda: [
            {"app_version": "2.11.0", "chart_version": "1.3.1", "tag": "nats-1.3.1"},
            {"app_version": "2.14.6", "chart_version": "2.14.6", "tag": "nats-2.14.6"},
        ],
    )
    ok = [
        response(text=chart(chart_version="1.3.1", app_version="2.11.0")),
        response(text=fixture("1.0.0")),
        response(text=chart()),
        response(text=fixture("2.14.6")),
    ]
    ok[failure_index] = response(error=requests.HTTPError("503"))
    monkeypatch.setattr(scraper.requests, "get", Mock(side_effect=ok))
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)

    with pytest.raises(requests.HTTPError):
        scraper.scrape()
    update.assert_not_called()


def test_static_table_covers_historical_matrix_boundaries_and_latest_chart_choices():
    root = COMPATIBILITY.parents[1]
    addon = yaml.safe_load((root / "static/compatibilities/nats.yaml").read_text())
    versions = {row["version"]: row for row in addon["versions"]}

    assert versions["2.7.3"]["chart_version"] == "0.14.1"
    assert versions["2.7.3"]["kube"] == ["1.23", "1.22", "1.21"]
    assert versions["2.9.20"]["chart_version"] == "1.0.0"
    assert versions["2.9.20"]["kube"] == ["1.26", "1.25", "1.24"]
    assert versions["2.11.0"]["chart_version"] == "1.3.1"
    # Chart 0.17.0 declares appVersion 2.8.0 but renders NATS 2.8.2 by default.
    assert "nats:2.8.2-alpine" in versions["2.8.0"]["images"]
    assert versions["2.11.6"]["chart_version"] == "1.3.9"
    assert versions["2.11.6"]["kube"] == ["1.32", "1.31", "1.30"]
    assert versions["2.14.6"]["chart_version"] == "2.14.6"


def test_manifest_registers_nats_once():
    root = COMPATIBILITY.parents[1]
    manifest = yaml.safe_load((root / "static/compatibilities/manifest.yaml").read_text())
    assert manifest["names"].count("nats") == 1


def test_workflow_accepts_quoted_literal_exclusion_list_when_nats_is_not_excluded():
    data = yaml.safe_load(fixture("1.3.9"))
    data["jobs"]["lint-test"]["steps"][-1]["run"] = (
        'ct install --all --chart-dirs "helm/charts" '
        '--excluded-charts "nats-account-server,nats-kafka,nats-operator,surveyor"'
    )
    assert scraper.parse_workflow(yaml.safe_dump(data)) == ["1.32", "1.31", "1.30"]


def test_workflow_rejects_quoted_nats_exclusion():
    data = yaml.safe_load(fixture("1.3.9"))
    data["jobs"]["lint-test"]["steps"][-1]["run"] = (
        'ct install --all --chart-dirs "helm/charts" '
        '--excluded-charts "nats,nats-operator"'
    )
    with pytest.raises(ValueError, match="NATS is excluded"):
        scraper.parse_workflow(yaml.safe_dump(data))


def test_workflow_rejects_dynamic_exclusion_value():
    data = yaml.safe_load(fixture("1.3.9"))
    data["jobs"]["lint-test"]["steps"][-1]["run"] = (
        'ct install --all --chart-dirs helm/charts --excluded-charts "$EXCLUDED"'
    )
    with pytest.raises(ValueError, match="dynamic or malformed"):
        scraper.parse_workflow(yaml.safe_dump(data))


@pytest.mark.parametrize("matrix_key", ["include", "exclude"])
def test_workflow_rejects_matrix_overrides(matrix_key):
    data = yaml.safe_load(fixture("1.3.9"))
    data["jobs"]["lint-test"]["strategy"]["matrix"][matrix_key] = [
        {"k8s": "1.30"}
    ]
    with pytest.raises(ValueError, match="include/exclude"):
        scraper.parse_workflow(yaml.safe_dump(data))


@pytest.mark.parametrize(
    "scope,value",
    [
        ("job", "${{ matrix.experimental }}"),
        ("step", "${{ matrix.experimental }}"),
    ],
)
def test_workflow_rejects_nonliteral_continue_on_error(scope, value):
    data = yaml.safe_load(fixture("1.3.9"))
    if scope == "job":
        data["jobs"]["lint-test"]["continue-on-error"] = value
    else:
        data["jobs"]["lint-test"]["steps"][-1]["continue-on-error"] = value
    with pytest.raises(ValueError, match="allowed to fail"):
        scraper.parse_workflow(yaml.safe_dump(data))


@pytest.mark.parametrize("scope", ["job", "cluster", "install"])
def test_workflow_rejects_conditional_evidence(scope):
    data = yaml.safe_load(fixture("1.3.9"))
    if scope == "job":
        data["jobs"]["lint-test"]["if"] = "${{ github.event_name == 'pull_request' }}"
    elif scope == "cluster":
        data["jobs"]["lint-test"]["steps"][0]["if"] = "${{ matrix.k8s != '1.30' }}"
    else:
        data["jobs"]["lint-test"]["steps"][-1]["if"] = "${{ matrix.k8s != '1.30' }}"
    with pytest.raises(ValueError, match="conditional"):
        scraper.parse_workflow(yaml.safe_dump(data))
