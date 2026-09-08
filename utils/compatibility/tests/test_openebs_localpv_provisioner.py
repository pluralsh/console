"""Offline regression coverage for the upstream OpenEBS compatibility matrix."""

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import yaml


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location(
    "openebs_localpv_provisioner", ROOT / "scrapers/openebs-localpv-provisioner.py"
)
scraper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scraper)
FIXTURES = Path(__file__).parent / "fixtures"
MATRIX = (FIXTURES / "openebs-localpv-matrix.md").read_text()
INDEX = (FIXTURES / "openebs-localpv-index.yaml").read_text()


def index(*entries):
    return yaml.safe_dump({"entries": {"localpv-provisioner": list(entries)}})


class OpenEBSLocalPVTests(unittest.TestCase):
    def test_live_source_fixtures_match_only_released_documented_versions(self):
        versions = scraper.build_versions(MATRIX, INDEX, "1.36")
        self.assertEqual([v["version"] for v in versions], ["4.6.0", "4.5.1", "4.5.0"])
        expected = [f"1.{minor}" for minor in range(36, 22, -1)]
        for version in versions:
            self.assertEqual(version["kube"], expected)
            self.assertEqual(version["version"], version["chart_version"])
            self.assertEqual(version["requirements"], [])
            self.assertEqual(version["incompatibilities"], [])

    def test_lower_bound_does_not_include_unsupported_or_future_minors(self):
        self.assertEqual(scraper.parse_matrix(MATRIX, "1.23")[(4, 6)], ["1.23"])
        self.assertEqual(scraper.parse_matrix(MATRIX, "1.22")[(4, 6)], [])

    def test_inclusive_bounded_column_and_union_do_not_duplicate_minors(self):
        matrix = MATRIX.replace("| `v4.5.x` | ✕                  | ✕", "| `v4.5.x` | ✕                  | ✓")
        actual = scraper.parse_matrix(matrix, "1.25")[(4, 5)]
        self.assertEqual(actual, ["1.25", "1.24", "1.23", "1.22", "1.21", "1.20", "1.19"])
        self.assertEqual(scraper._kube_versions("Kubernetes (v1.23 - v1.23)", "1.36"), ["1.23"])

    def test_future_matrix_families_are_discovered_but_head_is_ignored(self):
        matrix = MATRIX.replace("`v4.6.x`", "`v4.7.x`")
        versions = scraper.build_versions(matrix, index({"appVersion": "4.7.0", "version": "5.0.0"}), "1.36")
        self.assertEqual(versions[0]["version"], "4.7.0")
        self.assertEqual(versions[0]["chart_version"], "5.0.0")

    def test_application_and_chart_versions_are_not_confused(self):
        versions = scraper.build_versions(MATRIX, index(
            {"appVersion": "v4.6.0", "version": "5.1.0"},
            {"appVersion": "4.6.0", "version": "5.10.0"},
            {"appVersion": "4.6.0", "version": "5.2.0"},
        ), "1.36")
        self.assertEqual(versions[0]["chart_version"], "5.10.0")

    def test_prereleases_deprecated_and_undocumented_families_are_excluded(self):
        versions = scraper.build_versions(MATRIX, index(
            {"appVersion": "4.6.0", "version": "4.6.0"},
            {"appVersion": "4.6.1-prerelease", "version": "4.6.1"},
            {"appVersion": "4.6.2", "version": "4.6.2-develop"},
            {"appVersion": "4.6.3", "version": "4.6.3", "deprecated": True},
            {"appVersion": "4.4.0", "version": "4.4.0"},
            {"appVersion": "4.7.0", "version": "4.7.0"},
            {"appVersion": "HEAD", "version": "5.0.0"},
            {"version": "4.6.4"},
        ), "1.36")
        self.assertEqual([v["version"] for v in versions], ["4.6.0"])

    def test_bad_matrix_fails_instead_of_guessing_compatibility(self):
        for matrix in (
            "unrelated table",
            MATRIX.replace("Kubernetes >=v1.23", "Kubernetes latest"),
            MATRIX.replace("✓", "maybe"),
            MATRIX.replace("`v4.6.x`", "`v4.5.x`"),
            MATRIX.replace("`v4.6.x`", "`v4.6-beta`"),
            MATRIX.replace("| `v4.6.x` |", "| extra | `v4.6.x` |"),
        ):
            with self.subTest(matrix=matrix), self.assertRaises(ValueError):
                scraper.parse_matrix(matrix, "1.36")

    def test_invalid_kubernetes_and_reversed_range_fail(self):
        for version in (None, "", "latest", "1.36.1", "2.0"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                scraper.parse_matrix(MATRIX, version)
        with self.assertRaises(ValueError):
            scraper._kube_versions("Kubernetes (v1.25 - v1.23)", "1.36")

    def test_missing_chart_data_fails(self):
        for data in ("null", "entries: null", "entries: []", "entries: {}", index({"appVersion": "4.3.0", "version": "4.3.0"})):
            with self.subTest(data=data), self.assertRaises(ValueError):
                scraper.build_versions(MATRIX, data, "1.36")

    def test_failed_fetch_never_updates_existing_compatibilities(self):
        with patch.object(scraper, "fetch_page", return_value=None), \
             patch.object(scraper, "update_compatibility_info") as update, \
             patch.object(scraper, "print_error") as error:
            scraper.scrape()
        update.assert_not_called()
        error.assert_called_once()

    def test_valid_scrape_passes_source_derived_rows_to_writer(self):
        with patch.object(scraper, "fetch_page", side_effect=[MATRIX, INDEX]), \
             patch.object(scraper, "current_kube_version", return_value="1.36"), \
             patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        update.assert_called_once_with(scraper.TARGET_FILE, scraper.build_versions(MATRIX, INDEX, "1.36"))


if __name__ == "__main__":
    unittest.main()
