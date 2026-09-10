"""Offline regressions: python -m unittest discover -s tests -p 'test_strimzi_kafka.py'."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location("strimzi_scraper", COMPATIBILITY / "scrapers/strimzi-kafka.py")
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
from utils import reduce_versions, sort_versions

FIXTURE = Path(__file__).parent / "fixtures/strimzi-kafka/downloads.html"


class StrimziKafkaTests(unittest.TestCase):
    def setUp(self):
        self.html = FIXTURE.read_bytes()
        self.existing = {"versions": [{
            "version": "0.50.0", "kube": [f"1.{v}" for v in range(35, 26, -1)],
            "requirements": [], "incompatibilities": [], "summary": None,
        }]}
        self.charts = {version: version for version in ("1.2.0", "1.1.0", "1.0.1", "1.0.0", "0.51.0", "0.50.1")}

    def table(self, html=None):
        return scraper._find_supported_versions_table(BeautifulSoup(html or self.html, "html.parser"))

    def run_scrape(self):
        with patch.object(scraper, "fetch_page", return_value=self.html), \
                patch.object(scraper, "read_yaml", return_value=self.existing), \
                patch.object(scraper, "get_chart_versions", return_value=self.charts), \
                patch.object(scraper, "print_error"), \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        return update

    def test_current_tested_header_and_nested_footnote_are_recognized(self):
        rows = scraper._parse_rows(self.table())
        self.assertEqual(rows[0]["version"], "1.2.0")
        self.assertEqual(rows[0]["kube"], [f"1.{v}" for v in range(30, 37)])
        self.assertEqual(next(row["kube"] for row in rows if row["version"] == "0.51.0"), [f"1.{v}" for v in range(30, 36)])

    def test_legacy_header_still_works(self):
        self.html = self.html.replace(b"Tested Kubernetes versions", b"Kubernetes versions")
        self.assertEqual(scraper._parse_rows(self.table())[0]["version"], "1.2.0")

    def test_columns_are_selected_by_header_not_position(self):
        html = '<table><tr><th>Kafka versions</th><th>Tested Kubernetes versions</th><th>Operators</th></tr>'
        html += '<tr><td>4.3.1</td><td>1.35 - 1.36</td><td>1.2.0</td></tr></table>'
        self.assertEqual(scraper._parse_rows(self.table(html))[0]["kube"], ["1.35", "1.36"])

    def test_unrelated_table_is_not_treated_as_operator_support(self):
        self.assertIsNone(self.table('<table><tr><th>Kafka versions</th><th>Kubernetes versions</th></tr></table>'))

    def test_prerelease_and_unrelated_operator_labels_are_ignored(self):
        self.html = self.html.replace(b">1.2.0</a>", b">1.2.0-rc1</a>")
        self.assertNotIn("1.2.0", [row["version"] for row in scraper._parse_rows(self.table())])

    def test_equal_and_reversed_ranges_terminate(self):
        self.assertEqual(scraper._parse_kube_cell("v1.35 - v1.35"), ["1.35"])
        for value in ("1.36 - 1.30", "1.35 - 2.0"):
            self.assertEqual(scraper._parse_kube_cell(value), [])

    def test_range_and_list_parsing_rejects_partial_values(self):
        for value in ("1.30 - 1.36 TBD", "1.30, invalid", "1.36,", "1.35.1", "unknown", ""):
            with self.subTest(value=value):
                self.assertEqual(scraper._parse_kube_cell(value), [])
        self.assertEqual(scraper._parse_kube_cell("1.34, v1.35, 1.34"), ["1.34", "1.35"])

    def test_published_plus_range_is_bounded_by_cached_kubernetes_version(self):
        with patch.object(scraper, "current_kube_version", return_value="1.36"):
            self.assertEqual(scraper._parse_kube_cell("1.35+"), ["1.35", "1.36"])
            self.assertEqual(scraper._parse_kube_cell("1.37+"), [])
        with patch.object(scraper, "current_kube_version", return_value=None):
            self.assertEqual(scraper._parse_kube_cell("1.35+"), [])

    def test_superscript_footnote_is_removed_from_cell(self):
        soup = BeautifulSoup('<td>1.30 - 1.36<sup><a href="#note">1</a></sup></td>', "html.parser")
        self.assertEqual(scraper._cell_text(soup.td), "1.30 - 1.36")

    def test_new_boundaries_have_exact_charts_and_old_records_are_preserved(self):
        original = deepcopy(self.existing)
        update = self.run_scrape()
        update.assert_called_once()
        rows = update.call_args.args[1]
        self.assertTrue(all(row["chart_version"] == row["version"] for row in rows))
        self.assertNotIn("0.50.0", [row["version"] for row in rows])
        self.assertNotIn("0.49.0", [row["version"] for row in rows])
        # Same-compatibility patches do not create extra boundary records.
        reduced = reduce_versions(sort_versions(rows + self.existing["versions"]))
        self.assertEqual([row["version"] for row in reduced], ["1.2.0", "1.1.0", "1.0.0", "0.51.0", "0.50.0"])
        self.assertEqual(self.existing, original)

    def test_missing_or_prerelease_charts_do_not_create_ga_records(self):
        for charts in ({}, {"1.2.0": "1.2.0-rc1"}):
            self.charts = charts
            self.run_scrape().assert_not_called()

    def test_failed_or_malformed_source_never_writes(self):
        for content in (None, b"<html>No table</html>", self.html.replace(b"1.30 - 1.36", b"1.36 - 1.30")):
            self.html = content
            self.run_scrape().assert_not_called()

    def test_missing_required_cell_never_writes(self):
        self.html = self.html.replace(b"<td>1.30 - 1.36</td>", b"", 1)
        self.run_scrape().assert_not_called()

    def test_missing_existing_records_never_writes(self):
        self.existing = None
        self.run_scrape().assert_not_called()

    def test_current_records_make_rerun_a_noop(self):
        first = self.run_scrape()
        self.existing["versions"].extend(deepcopy(first.call_args.args[1]))
        self.run_scrape().assert_not_called()

    def test_delayed_older_chart_is_backfilled_after_newer_version_was_saved(self):
        del self.charts["1.1.0"]
        first = self.run_scrape()
        first_rows = first.call_args.args[1]
        self.assertIn("1.2.0", [row["version"] for row in first_rows])
        self.assertNotIn("1.1.0", [row["version"] for row in first_rows])
        self.existing["versions"].extend(deepcopy(first_rows))
        self.charts["1.1.0"] = "1.1.0"
        second = self.run_scrape()
        second.assert_called_once()
        self.assertEqual([row["version"] for row in second.call_args.args[1]], ["1.1.0"])

    def test_missing_baseline_chart_does_not_hide_available_patch(self):
        del self.charts["1.0.0"]
        original = deepcopy(self.existing)
        first = self.run_scrape()
        first.assert_called_once()
        rows = first.call_args.args[1]
        self.assertEqual([row["version"] for row in rows], ["1.2.0", "1.1.0", "1.0.1", "0.51.0"])
        patch_row = next(row for row in rows if row["version"] == "1.0.1")
        self.assertEqual(patch_row["chart_version"], "1.0.1")
        self.assertEqual(patch_row["kube"], [f"1.{v}" for v in range(36, 29, -1)])
        self.assertEqual(self.existing, original)
        self.existing["versions"].extend(deepcopy(rows))
        # A complete chart-backed sequence must not repeatedly rewrite itself.
        self.run_scrape().assert_not_called()

    def test_changed_support_backport_is_added_below_latest_saved_minor(self):
        first = self.run_scrape()
        self.existing["versions"].extend(deepcopy(first.call_args.args[1]))
        original = deepcopy(self.existing)
        # Synthetic future backport, with an explicit changed matrix window.
        backport = b'<tr><td>1.1.1</td><td>1.0.0</td><td>0.17.1</td><td>4.3.0</td><td>1.30 - 1.37</td></tr>'
        self.html = self.html.replace(b"</table>", backport + b"</table>")
        self.charts["1.1.1"] = "1.1.1"
        second = self.run_scrape()
        second.assert_called_once()
        self.assertEqual([row["version"] for row in second.call_args.args[1]], ["1.1.1"])
        self.assertEqual(second.call_args.args[1][0]["kube"], [f"1.{v}" for v in range(37, 29, -1)])
        self.assertEqual(self.existing, original)


if __name__ == "__main__":
    unittest.main()
