import importlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import jsonschema
import yaml

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
scraper = importlib.import_module("scrapers.crunchy-postgres-operator")
FIXTURE = (
    Path(__file__).parent / "fixtures" / "crunchy-postgres-supported-platforms.html"
).read_bytes()
STATIC_DIR = COMPATIBILITY_DIR.parents[1] / "static" / "compatibilities"


def matrix(rows, headers=None):
    headers = headers or [
        "Crunchy Postgres for Kubernetes Series", "Kubernetes Version", "OpenShift Version"
    ]
    return "<table><tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>" + "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
        for row in rows
    ) + "</table>"


class CrunchyPostgresOperatorTests(unittest.TestCase):
    def test_published_matrix_including_extended_support(self):
        rows = scraper.parse_page(FIXTURE)
        expected_ranges = {
            "6.0.0": (32, 36), "5.8.0": (30, 36), "5.7.0": (28, 34),
            "5.6.0": (27, 32), "5.5.0": (25, 30), "5.4.0": (24, 29),
            "5.3.0": (22, 26), "5.2.0": (21, 24), "5.1.0": (20, 24),
            "5.0.0": (20, 24), "4.7.0": (17, 26), "4.6.0": (17, 21),
        }
        self.assertEqual([r["version"] for r in rows], list(expected_ranges))
        for row in rows:
            first, last = expected_ranges[row["version"]]
            self.assertEqual(row["kube"], [f"1.{v}" for v in range(last, first - 1, -1)])
            self.assertNotIn("chart_version", row)
            self.assertEqual(row["requirements"], [])
            self.assertEqual(row["incompatibilities"], [])

    def test_bounded_range_formats_and_deduplication(self):
        for text in ("1.30–32", "1.30 - 1.32", "v1.30 — v1.32", "1.30, 1.31–32, 1.32"):
            with self.subTest(text=text):
                self.assertEqual(scraper.parse_kube_versions(text), ["1.32", "1.31", "1.30"])
        self.assertEqual(scraper.parse_kube_versions("1.30–30"), ["1.30"])
        self.assertEqual(scraper.parse_kube_versions("  v1.30  "), ["1.30"])

    def test_rejects_unbounded_reversed_cross_major_and_malformed_ranges(self):
        for text in ("1.30+", ">=1.30", "1.30 and newer", "1.32–30", "1.30–2.1", "", "TBD", "1.30,"):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    scraper.parse_kube_versions(text)

    def test_selects_named_columns_without_importing_openshift_versions(self):
        unrelated = matrix([["6.0.x", "4.16–22"]], ["Postgres version", "OpenShift Version"])
        content = unrelated + matrix(
            [["4.16–22", "1.32–33<sup>1</sup>", "6.0.x"]],
            ["OpenShift Version", "Kubernetes Version", "Crunchy Postgres for Kubernetes Series"],
        )
        rows = scraper.parse_page(content)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kube"], ["1.33", "1.32"])

    def test_legacy_header_and_numeric_version_sort(self):
        content = matrix(
            [["5.9.x", "1.30"], ["v5.10.X", "1.31"]],
            ["PGO Series", "Kubernetes Versions"],
        )
        self.assertEqual([r["version"] for r in scraper.parse_page(content)], ["5.10.0", "5.9.0"])

    def test_identical_duplicate_rows_are_deduplicated(self):
        rows = scraper.parse_page(matrix([["6.0.x", "1.32–33"]] * 2))
        self.assertEqual(len(rows), 1)

    def test_conflicting_or_incomplete_rows_fail_instead_of_partially_updating(self):
        for content in (
            matrix([["6.0.x", "1.32–33"], ["6.0.x", "1.32–34"]]),
            matrix([["6.0.x", "1.32–33"], ["5.8.x"]]),
            matrix([["6.0.x", "1.32–33"], ["5.8.x", "1.30+"]]),
            matrix([["6.0.0-rc.1", "1.32–33"]]),
        ):
            with self.subTest(content=content):
                with self.assertRaises(ValueError):
                    scraper.parse_page(content)
                with patch.object(scraper, "fetch_page", return_value=content), \
                        patch.object(scraper, "update_compatibility_info") as update, \
                        patch.object(scraper, "print_error"):
                    scraper.scrape()
                    update.assert_not_called()

    def test_missing_table_and_fetch_failure_preserve_existing_file(self):
        for content in (None, b"<html>upstream unavailable</html>", matrix([])):
            with self.subTest(content=content):
                with patch.object(scraper, "fetch_page", return_value=content), \
                        patch.object(scraper, "update_compatibility_info") as update, \
                        patch.object(scraper, "print_error"):
                    scraper.scrape()
                    update.assert_not_called()

    def test_scrape_writes_official_matrix(self):
        with patch.object(scraper, "fetch_page", return_value=FIXTURE) as fetch, \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        fetch.assert_called_once_with(scraper.COMPATIBILITY_URL)
        update.assert_called_once_with(scraper.TARGET_FILE, scraper.parse_page(FIXTURE))

    def test_generated_static_file_matches_source_and_schema(self):
        data = yaml.safe_load((STATIC_DIR / "crunchy-postgres-operator.yaml").read_text())
        schema = json.loads((STATIC_DIR / "schema.json").read_text())
        jsonschema.validate(data, schema)
        expected = scraper.parse_page(FIXTURE)
        self.assertEqual(len(data["versions"]), len(expected))
        for actual, source in zip(data["versions"], expected):
            self.assertEqual({key: actual[key] for key in source}, dict(source))
        self.assertEqual(data["helm_repository_url"], "oci://registry.developers.crunchydata.com/crunchydata/pgo")
        self.assertEqual(data["chart_name"], "pgo")


if __name__ == "__main__":
    unittest.main()
