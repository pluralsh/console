"""Offline regressions for the Kyverno compatibility scraper."""

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "kyverno_scraper", COMPATIBILITY / "scrapers/kyverno.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


CURRENT_RELEASE_HTML = b"""
<html><body>
<table>
  <tr><td><strong>Supported Release:</strong></td><td>v1.19 (released: Aug 2026)</td></tr>
  <tr><td><strong>Estimated End of Life:</strong></td><td>v1.20 release</td></tr>
  <tr><td><strong>Kubernetes Versions Supported:</strong></td><td>v1.33 - v1.35</td></tr>
</table>
</body></html>
"""


class KyvernoTests(unittest.TestCase):
    def table(self, html=CURRENT_RELEASE_HTML):
        return scraper._find_compat_table(
            BeautifulSoup(html, "html.parser")
        )

    def test_current_release_table_is_recognized(self):
        self.assertIsNotNone(self.table())

    def test_current_release_format_is_parsed(self):
        with patch.object(
            scraper, "get_chart_versions", return_value={"1.19.0": "3.9.0"}
        ):
            rows = scraper._parse_rows(self.table())

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "1.19.0")
        self.assertEqual(rows[0]["kube"], ["1.33", "1.34", "1.35"])
        self.assertEqual(rows[0]["chart_version"], "3.9.0")

    def test_unrelated_table_is_ignored(self):
        html = b"<table><tr><td>Version</td><td>1.19</td></tr></table>"
        self.assertIsNone(self.table(html))

    def test_malformed_kubernetes_range_does_not_write(self):
        html = CURRENT_RELEASE_HTML.replace(
            b"v1.33 - v1.35", b"unknown"
        )
        with patch.object(scraper, "get_chart_versions", return_value={}):
            self.assertEqual(scraper._parse_rows(self.table(html)), [])

    def test_scrape_uses_release_page_data(self):
        with patch.object(scraper, "fetch_page", return_value=CURRENT_RELEASE_HTML), \
                patch.object(
                    scraper,
                    "get_chart_versions",
                    return_value={"1.19.0": "3.9.0"},
                ), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()

        update.assert_called_once()
        row = update.call_args.args[1][0]
        self.assertEqual(row["version"], "1.19.0")
        self.assertEqual(row["kube"], ["1.33", "1.34", "1.35"])


if __name__ == "__main__":
    unittest.main()
