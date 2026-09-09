import importlib.util
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest


COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "vertical_pod_autoscaler_scraper",
    COMPATIBILITY / "scrapers" / "vertical-pod-autoscaler.py",
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


OFFICIAL_SHAPED_MATRIX = """
# Installation

## Compatibility

| VPA version     | Kubernetes version |
| --------------- | ------------------ |
| 1.7.x           | 1.35 – 1.37        |
| 1.6.x           | 1.34 – 1.36        |
| 1.5.x           | 1.33 – 1.35        |

## Notice on CRD update (>=1.0.0)

Unrelated text.
"""


def test_parses_official_compatibility_matrix():
    assert scraper.parse_compatibility_matrix(OFFICIAL_SHAPED_MATRIX) == {
        "1.7": ["1.37", "1.36", "1.35"],
        "1.6": ["1.36", "1.35", "1.34"],
        "1.5": ["1.35", "1.34", "1.33"],
    }


@pytest.mark.parametrize(
    "content,match",
    [
        ("# Installation\n", "Compatibility section"),
        (
            "## Compatibility\n| VPA version | Kubernetes version |\n| - | - |\n| 1.7.x | >=1.35 |\n",
            "Unrecognized Kubernetes compatibility range",
        ),
        (
            "## Compatibility\n| VPA version | Kubernetes version |\n| - | - |\n| 1.7 | 1.35 – 1.37 |\n",
            "Unrecognized VPA version cell",
        ),
    ],
)
def test_rejects_missing_or_ambiguous_matrix(content, match):
    with pytest.raises(ValueError, match=match):
        scraper.parse_compatibility_matrix(content)


def test_rejects_duplicate_minor_rows():
    content = """
## Compatibility
| VPA version | Kubernetes version |
| - | - |
| 1.7.x | 1.35 - 1.37 |
| 1.7.x | 1.35 - 1.37 |
"""
    with pytest.raises(ValueError, match="Duplicate VPA compatibility row"):
        scraper.parse_compatibility_matrix(content)


def test_build_rows_selects_latest_stable_patch_for_each_documented_minor():
    matrix = scraper.parse_compatibility_matrix(OFFICIAL_SHAPED_MATRIX)
    charts = {
        "1.7.0": "0.10.0",
        "1.7.1": "0.12.0",
        "1.7.2-rc.1": "0.13.0-rc.1",
        "1.6.0": "0.9.0",
        "1.5.1": "0.8.0",
        "1.4.2": "0.4.0",
    }

    rows = scraper.build_rows(matrix, charts)

    assert [(row["version"], row["chart_version"]) for row in rows] == [
        ("1.7.1", "0.12.0"),
        ("1.6.0", "0.9.0"),
        ("1.5.1", "0.8.0"),
    ]
    assert rows[0]["kube"] == ["1.37", "1.36", "1.35"]
    assert rows[1]["kube"] == ["1.36", "1.35", "1.34"]
    assert rows[2]["kube"] == ["1.35", "1.34", "1.33"]


def test_build_rows_fails_if_a_documented_minor_has_no_chart():
    matrix = scraper.parse_compatibility_matrix(OFFICIAL_SHAPED_MATRIX)
    charts = {"1.7.1": "0.12.0", "1.6.0": "0.9.0"}

    with pytest.raises(ValueError, match="1.5.x"):
        scraper.build_rows(matrix, charts)


def test_scrape_writes_only_after_all_sources_are_valid(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _: OFFICIAL_SHAPED_MATRIX.encode())
    monkeypatch.setattr(
        scraper,
        "get_chart_versions",
        lambda _: {"1.7.1": "0.12.0", "1.6.0": "0.9.0", "1.5.1": "0.8.0"},
    )
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)

    scraper.scrape()

    update.assert_called_once()
    path, rows = update.call_args.args
    assert path == scraper.compatibility_file
    assert [row["version"] for row in rows] == ["1.7.1", "1.6.0", "1.5.1"]


def test_scrape_does_not_write_on_malformed_source(monkeypatch):
    monkeypatch.setattr(scraper, "fetch_page", lambda _: b"## Compatibility\nnot a table")
    monkeypatch.setattr(scraper, "get_chart_versions", Mock())
    update = Mock()
    monkeypatch.setattr(scraper, "update_compatibility_info", update)

    with pytest.raises(ValueError, match="No VPA compatibility rows"):
        scraper.scrape()

    scraper.get_chart_versions.assert_not_called()
    update.assert_not_called()
