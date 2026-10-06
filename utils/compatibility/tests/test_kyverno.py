import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "kyverno.py"
spec = importlib.util.spec_from_file_location("kyverno", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

VERSION_TS = """export interface CompatibilityMatrixEntry {
  kyverno: string
  minKubernetes: string
  maxKubernetes: string
}

export const latestStableVersion = 'v1.19'

export const compatibilityMatrix: CompatibilityMatrixEntry[] = [
  { kyverno: '1.19.x', minKubernetes: '1.33', maxKubernetes: '1.35' },
  { kyverno: '1.18.x', minKubernetes: '1.33', maxKubernetes: '1.35' },
]
"""

RELEASES_HTML = """<h2 id="community-patch-support">Community Patch Support</h2>
<table>
  <thead><tr><th></th><th></th></tr></thead>
  <tbody>
    <tr><td><strong>Supported Release:</strong></td><td>v1.20 (released: Nov 2026)</td></tr>
    <tr><td><strong>Estimated End of Life:</strong></td><td>v1.21 release (estimated: Feb 2027)</td></tr>
    <tr><td><strong>Kubernetes Versions Supported:</strong></td><td>v1.34 - v1.36</td></tr>
  </tbody>
</table>
"""


class KyvernoTests(unittest.TestCase):
    def test_parses_matrix_constants(self):
        self.assertEqual(
            scraper.parse_matrix(VERSION_TS),
            [("1.19", "1.33", "1.35"), ("1.18", "1.33", "1.35")],
        )

    def test_missing_matrix_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "matrix entries not found"):
            scraper.parse_matrix("export const latestStableVersion = 'v1.19'")

    def test_parses_supported_release_table(self):
        self.assertEqual(
            scraper.parse_releases_page(RELEASES_HTML),
            [("1.20", "1.34", "1.36")],
        )

    def test_missing_release_table_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "supported release table not found"):
            scraper.parse_releases_page("<p>See GitHub releases.</p>")

    def test_build_rows_merges_sources_with_precedence(self):
        rows = scraper.build_rows(
            [
                [("1.19", "1.33", "1.35")],
                [("1.19", "1.30", "1.31"), ("1.20", "1.34", "1.36")],
                [("1.17", "1.32", "1.35")],
            ],
            {"1.19.0": "3.9.0", "1.17.0": "3.7.0"},
        )
        by_version = {row["version"]: row for row in rows}

        self.assertEqual(sorted(by_version), ["1.17.0", "1.19.0", "1.20.0"])
        self.assertEqual(by_version["1.19.0"]["kube"], ["1.35", "1.34", "1.33"])
        self.assertEqual(by_version["1.20.0"]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(by_version["1.19.0"]["chart_version"], "3.9.0")
        self.assertIsNone(by_version["1.20.0"]["chart_version"])

    def test_single_version_range_has_no_extra_versions(self):
        rows = scraper.build_rows([[("1.19", "1.35", "1.35")]], {})
        self.assertEqual(rows[0]["kube"], ["1.35"])

    def test_inverted_range_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Invalid Kubernetes range"):
            scraper.build_rows([[("1.19", "1.35", "1.33")]], {})

    def test_scrape_wires_sources_and_backfill(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(
            side_effect=lambda url: (
                VERSION_TS.encode() if url == scraper.matrix_url else RELEASES_HTML.encode()
            )
        )
        helpers.get_chart_versions = Mock(return_value={"1.19.0": "3.9.0"})
        helpers.print_error = Mock()
        helpers.update_compatibility_info = Mock()

        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()

        helpers.print_error.assert_not_called()
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/kyverno.yaml")
        self.assertEqual(
            [row["version"] for row in rows],
            ["1.19.0", "1.18.0", "1.20.0", "1.17.0"],
        )

    def test_scrape_survives_one_missing_source(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(
            side_effect=lambda url: VERSION_TS.encode() if url == scraper.matrix_url else None
        )
        helpers.get_chart_versions = Mock(return_value={})
        helpers.print_error = Mock()
        helpers.update_compatibility_info = Mock()

        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()

        helpers.print_error.assert_called_once()
        _, rows = helpers.update_compatibility_info.call_args.args
        self.assertIn("1.19.0", [row["version"] for row in rows])

    def test_scrape_writes_nothing_without_any_source(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=None)
        helpers.get_chart_versions = Mock(return_value={})
        helpers.print_error = Mock()
        helpers.update_compatibility_info = Mock()

        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()

        helpers.update_compatibility_info.assert_not_called()


if __name__ == "__main__":
    unittest.main()
