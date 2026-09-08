import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

helpers = ModuleType("utils")
helpers.fetch_page = Mock()
helpers.update_compatibility_info = Mock()

_original_utils = sys.modules.get("utils")
sys.modules["utils"] = helpers
try:
    SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "scylla-operator.py"
    spec = importlib.util.spec_from_file_location("scylla_operator", SCRAPER_PATH)
    scraper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scraper)
finally:
    if _original_utils is None:
        sys.modules.pop("utils", None)
    else:
        sys.modules["utils"] = _original_utils


def releases_page(series=("1.22", "1.21")) -> bytes:
    rows = "".join(f"<tr><td>{value}</td><td>date</td><td>end</td></tr>" for value in series)
    return f"<h2>Supported releases</h2><table><tr><th>Release</th></tr>{rows}</table>".encode()


def support_page(kube="1.33 - 1.36") -> bytes:
    return (
        "<table><tr><th>Component</th><th>Supported versions</th></tr>"
        f"<tr><td>Kubernetes</td><td>{kube}</td></tr></table>"
    ).encode()


class ScyllaOperatorTests(unittest.TestCase):
    def test_supported_series_uses_two_current_releases(self):
        self.assertEqual(
            scraper.parse_supported_series(releases_page(("1.23", "1.22", "1.21"))),
            ["1.23", "1.22"],
        )

    def test_supported_series_fails_closed_when_section_missing(self):
        with self.assertRaisesRegex(ValueError, "supported releases section not found"):
            scraper.parse_supported_series(b"<html><h2>Other</h2></html>")

    def test_kubernetes_range_expands_descending(self):
        self.assertEqual(
            scraper.parse_kubernetes_versions(support_page("1.33 - 1.36")),
            ["1.36", "1.35", "1.34", "1.33"],
        )

    def test_kubernetes_row_missing_fails_closed(self):
        html = b"<table><tr><th>Component</th><th>Supported versions</th></tr><tr><td>OpenShift</td><td>4.20</td></tr></table>"
        with self.assertRaisesRegex(ValueError, "Kubernetes row not found"):
            scraper.parse_kubernetes_versions(html)

    def test_chart_index_uses_latest_stable_patch_per_series(self):
        index = b"""
entries:
  scylla-operator:
    - version: v1.22.0
      appVersion: 1.22.0
    - version: v1.21.1
      appVersion: 1.21.1
    - version: v1.21.0
      appVersion: 1.21.0
    - version: v1.23.0-rc.1
      appVersion: 1.23.0-rc.1
"""
        self.assertEqual(
            scraper.parse_chart_versions(index),
            {"1.22": "1.22.0|1.22.0", "1.21": "1.21.1|1.21.1"},
        )

    def test_missing_chart_entries_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "has no 'scylla-operator' entries"):
            scraper.parse_chart_versions(b"entries: {}\n")

    def test_invalid_utf8_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Could not decode"):
            scraper.parse_supported_series(b"\xff")

    def test_scrape_wires_official_sources_to_updater(self):
        index = b"entries:\n  scylla-operator:\n    - version: v1.22.0\n      appVersion: 1.22.0\n    - version: v1.21.1\n      appVersion: 1.21.1\n"

        def fetch(url):
            if url == scraper.chart_index_url:
                return index
            if url == scraper.releases_url:
                return releases_page() + support_page()
            if url.endswith("/v1.21/reference/releases.html"):
                return support_page()
            self.fail(f"unexpected URL: {url}")

        with (
            patch.object(scraper, "fetch_page", side_effect=fetch),
            patch.object(scraper, "update_compatibility_info") as update,
        ):
            scraper.scrape()

        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/scylla-operator.yaml")
        self.assertEqual([row["version"] for row in rows], ["1.22.0", "1.21.1"])
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34", "1.33"])


if __name__ == "__main__":
    unittest.main()
