import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, call, patch

helpers = ModuleType("utils")
helpers.current_kube_version = Mock(return_value="1.36")
helpers.fetch_page = Mock()
helpers.print_error = Mock()
helpers.update_compatibility_info = Mock()

_original_utils = sys.modules.get("utils")
sys.modules["utils"] = helpers
try:
    SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "tekton-operator.py"
    spec = importlib.util.spec_from_file_location("tekton_operator", SCRAPER_PATH)
    scraper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scraper)
finally:
    if _original_utils is None:
        sys.modules.pop("utils", None)
    else:
        sys.modules["utils"] = _original_utils


README_FIXTURE = b"""
### In Support
| Version | Minimum K8S | Pipeline | Release Date | End of Life |
|---|---|---|---|---|
| v0.81.x LTS | 1.28.x | v1.14.x LTS | 2026-08-10 | 2027-08-10 |
| v0.80.x LTS | 1.28.x | v1.12.x LTS | 2026-06-11 | 2027-06-11 |

### End of Life
| Version | Minimum K8S | Pipeline | Release Date | End of Life |
|---|---|---|---|---|
| v0.71.x | 1.27.x | v0.59.x | 2024-06-06 | 2025-06-06 |
| v0.70.x | 1.25.x | v0.56.x | 2024-02-21 | 2025-02-21 |
"""


def rel(tag, *, prerelease=False, draft=False):
    return {"tag_name": tag, "prerelease": prerelease, "draft": draft}


class TektonOperatorTests(unittest.TestCase):
    def test_parses_current_and_historical_minimums(self):
        self.assertEqual(
            scraper.parse_minimum_kubernetes(README_FIXTURE),
            {"0.81": "1.28", "0.80": "1.28", "0.71": "1.27", "0.70": "1.25"},
        )

    def test_missing_table_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "compatibility table not found"):
            scraper.parse_minimum_kubernetes(b"# README\nNo matrix here")

    def test_conflicting_duplicate_series_fails_closed(self):
        fixture = b"| v0.81.x LTS | 1.28.x | x | x | x |\n| v0.81.x LTS | 1.29.x | x | x | x |"
        with self.assertRaisesRegex(ValueError, "Conflicting Kubernetes minimums"):
            scraper.parse_minimum_kubernetes(fixture)

    def test_parses_chart_specific_minimum(self):
        self.assertEqual(
            scraper.parse_chart_minimum(b'kubernetesMinVersion: "v1.34.0"\n'),
            "1.34",
        )
        self.assertIsNone(scraper.parse_chart_minimum(b"operator:\n  replicas: 1\n"))

    def test_invalid_chart_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Invalid Tekton Operator kubernetesMinVersion"):
            scraper.parse_chart_minimum(b'kubernetesMinVersion: "latest"\n')

    def test_release_parser_requires_runtime_and_chart_pair(self):
        pages = [[
            rel("v0.81.1"),
            rel("tekton-operator-0.81.1"),
            rel("v0.80.0"),
            rel("tekton-operator-0.79.1"),
            rel("v0.79.1"),
            rel("v0.82.0-rc.1", prerelease=True),
        ]]
        self.assertEqual(
            scraper.parse_release_records(pages),
            {"0.81.1", "0.79.1"},
        )

    def test_selects_latest_patch_and_honors_stricter_chart_floor(self):
        rows = scraper.build_rows(
            {"0.81": "1.28", "0.80": "1.28"},
            {"0.81.0", "0.81.1", "0.80.0"},
            "1.36",
            {"0.81.1": "1.34", "0.80.0": None},
        )
        self.assertEqual([row["version"] for row in rows], ["0.81.1", "0.80.0"])
        self.assertEqual(rows[0]["chart_version"], "0.81.1")
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(
            rows[1]["kube"],
            ["1.36", "1.35", "1.34", "1.33", "1.32", "1.31", "1.30", "1.29", "1.28"],
        )

    def test_series_floor_wins_if_chart_floor_is_lower(self):
        self.assertEqual(scraper.stricter_minimum("1.30", "1.28"), "1.30")

    def test_older_series_without_supported_oci_chart_is_not_invented(self):
        rows = scraper.build_rows(
            {"0.81": "1.28", "0.79": "1.28"},
            {"0.81.1", "0.79.1"},
            "1.36",
            {"0.81.1": "1.34"},
        )
        self.assertEqual([row["version"] for row in rows], ["0.81.1"])

    def test_invalid_kube_range_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unsupported Kubernetes range"):
            scraper.expand_lower_bound("1.29", "1.28")

    def test_scrape_wires_sources_to_plural_updater(self):
        release_pages = [[
            rel("v0.81.1"), rel("tekton-operator-0.81.1"),
            rel("v0.80.0"), rel("tekton-operator-0.80.0"),
        ]]

        def chart_min(version):
            return "1.34" if version == "0.81.1" else None

        with (
            patch.object(scraper, "fetch_page", return_value=README_FIXTURE),
            patch.object(scraper, "fetch_release_pages", return_value=release_pages),
            patch.object(scraper, "fetch_chart_minimum", side_effect=chart_min),
            patch.object(scraper, "current_kube_version", return_value="1.36"),
            patch.object(scraper, "update_compatibility_info") as update,
        ):
            scraper.scrape()

        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/tekton-operator.yaml")
        self.assertEqual([row["version"] for row in rows], ["0.81.1", "0.80.0"])
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])

    def test_scrape_fetches_chart_metadata_only_for_emitted_versions(self):
        release_pages = [[
            rel("v0.81.0"), rel("tekton-operator-0.81.0"),
            rel("v0.81.1"), rel("tekton-operator-0.81.1"),
            rel("v0.80.0"), rel("tekton-operator-0.80.0"),
            rel("v0.82.0"), rel("tekton-operator-0.82.0"),
        ]]

        with (
            patch.object(scraper, "fetch_page", return_value=README_FIXTURE),
            patch.object(scraper, "fetch_release_pages", return_value=release_pages),
            patch.object(scraper, "fetch_chart_minimum", return_value=None) as fetch_chart,
            patch.object(scraper, "current_kube_version", return_value="1.36"),
            patch.object(scraper, "update_compatibility_info"),
        ):
            scraper.scrape()

        self.assertEqual(fetch_chart.call_count, 2)
        fetch_chart.assert_has_calls(
            [call("0.81.1"), call("0.80.0")], any_order=True
        )

    def test_scrape_does_not_write_on_source_failure(self):
        with (
            patch.object(scraper, "fetch_page", return_value=b"bad readme"),
            patch.object(scraper, "update_compatibility_info") as update,
            patch.object(scraper, "print_error") as error,
        ):
            scraper.scrape()
        update.assert_not_called()
        error.assert_called_once()


if __name__ == "__main__":
    unittest.main()
