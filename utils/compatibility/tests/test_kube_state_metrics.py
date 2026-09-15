import importlib.util
from pathlib import Path


SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "kube-state-metrics.py"
spec = importlib.util.spec_from_file_location("kube_state_metrics", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


README_FIXTURE = b"""
#### Compatibility matrix

| kube-state-metrics | Kubernetes client-go Version |
|--------------------|:----------------------------:|
| **v2.16.0** | v1.32 |
| **v2.17.0** | v1.33 |
| **v2.18.0** | v1.34 |
| **v2.19.0** | v1.35 |
| **v2.20.0** | v1.36 |
| **main** | v1.36 |

#### Resource group version compatibility
"""


def test_parse_compatibility_matrix_uses_only_release_rows():
    assert scraper.parse_compatibility_matrix(README_FIXTURE) == {
        "2.16.0": ["1.32"],
        "2.17.0": ["1.33"],
        "2.18.0": ["1.34"],
        "2.19.0": ["1.35"],
        "2.20.0": ["1.36"],
    }


def test_parse_compatibility_matrix_fails_closed_if_heading_changes():
    assert scraper.parse_compatibility_matrix(
        README_FIXTURE.replace(b"#### Compatibility matrix", b"#### Version support")
    ) == {}


def test_parse_compatibility_matrix_ignores_malformed_release_rows():
    malformed = README_FIXTURE.replace(
        b"| **v2.20.0** | v1.36 |",
        b"| **not-a-release** | Kubernetes latest |",
    )
    rows = scraper.parse_compatibility_matrix(malformed)
    assert "2.20.0" not in rows
    assert len(rows) == 4


def test_extract_table_data_joins_exact_chart_versions_and_sorts_newest_first():
    matrix = scraper.parse_compatibility_matrix(README_FIXTURE)
    charts = {
        "2.16.0": "6.1.5",
        "2.17.0": "7.0.1",
        "2.18.0": "7.3.0",
        "2.19.0": "7.4.0",
        "2.20.0": "8.5.0",
    }

    rows = scraper.extract_table_data(matrix, charts)

    assert [row["version"] for row in rows] == [
        "2.20.0",
        "2.19.0",
        "2.18.0",
        "2.17.0",
        "2.16.0",
    ]
    assert rows[0]["kube"] == ["1.36"]
    assert rows[0]["chart_version"] == "8.5.0"
    assert rows[0]["images"] == [
        "registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0"
    ]


def test_extract_table_data_skips_release_without_matching_chart():
    matrix = {"2.20.0": ["1.36"], "2.19.0": ["1.35"]}
    rows = scraper.extract_table_data(matrix, {"2.20.0": "8.5.0"})
    assert [row["version"] for row in rows] == ["2.20.0"]


def test_scrape_fails_closed_when_upstream_matrix_disappears(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _url: b"# no matrix here")
    monkeypatch.setattr(scraper, "get_chart_versions", lambda _app: {"2.20.0": "8.5.0"})
    updates = []
    monkeypatch.setattr(
        scraper,
        "update_compatibility_info",
        lambda *args: updates.append(args),
    )

    scraper.scrape()

    assert updates == []


def test_scrape_wires_parsed_rows_to_expected_output(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _url: README_FIXTURE)
    monkeypatch.setattr(
        scraper,
        "get_chart_versions",
        lambda _app: {
            "2.16.0": "6.1.5",
            "2.17.0": "7.0.1",
            "2.18.0": "7.3.0",
            "2.19.0": "7.4.0",
            "2.20.0": "8.5.0",
        },
    )
    updates = []
    monkeypatch.setattr(
        scraper,
        "update_compatibility_info",
        lambda path, rows: updates.append((path, rows)),
    )

    scraper.scrape()

    assert len(updates) == 1
    path, rows = updates[0]
    assert path == "../../static/compatibilities/kube-state-metrics.yaml"
    assert rows[0]["version"] == "2.20.0"
    assert rows[-1]["version"] == "2.16.0"
