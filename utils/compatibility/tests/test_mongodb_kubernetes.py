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
    SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "mongodb-kubernetes.py"
    spec = importlib.util.spec_from_file_location("mongodb_kubernetes", SCRAPER_PATH)
    scraper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scraper)
finally:
    if _original_utils is None:
        sys.modules.pop("utils", None)
    else:
        sys.modules["utils"] = _original_utils


def table(rows: str, headers=None) -> bytes:
    headers = headers or [
        "Kubernetes Operator Release Series",
        "Release Date",
        "EOL date",
        "Kubernetes Version",
        "OpenShift Version",
    ]
    th = "".join(f"<th>{header}</th>" for header in headers)
    return f"<html><body><table><thead><tr>{th}</tr></thead><tbody>{rows}</tbody></table></body></html>".encode()


def row(version: str, kube: str) -> str:
    return (
        f"<tr><td>{version}</td><td>August 26, 2026</td><td>to be determined</td>"
        f"<td>{kube}</td><td>4.22</td></tr>"
    )


class MongoDbKubernetesTests(unittest.TestCase):
    def test_parses_compatibility_table_and_sorts_versions(self):
        html = table(row("1.10.0", "1.34, 1.35, 1.36") + row("1.11.0", "1.34, 1.35, 1.36"))
        rows = scraper.parse_compatibility_page(
            html,
            {"1.10.0": "1.10.0", "1.11.0": "1.11.0"},
        )
        self.assertEqual([item["version"] for item in rows], ["1.11.0", "1.10.0"])
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(rows[0]["chart_version"], "1.11.0")

    def test_skips_release_without_official_chart(self):
        html = table(row("1.12.0", "1.35, 1.36") + row("1.11.0", "1.34, 1.35, 1.36"))
        rows = scraper.parse_compatibility_page(html, {"1.11.0": "1.11.0"})
        self.assertEqual([item["version"] for item in rows], ["1.11.0"])

    def test_missing_compatibility_table_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "compatibility table not found"):
            scraper.parse_compatibility_page(b"<html><table><th>Other</th></table></html>", {"1.11.0": "1.11.0"})

    def test_unexpected_headers_fail_closed(self):
        html = table(row("1.11.0", "1.34, 1.35, 1.36"), headers=["Kubernetes Operator Release Series", "Other"])
        with self.assertRaisesRegex(ValueError, "compatibility table not found"):
            scraper.parse_compatibility_page(html, {"1.11.0": "1.11.0"})

    def test_malformed_release_fails_closed(self):
        html = table(row("release-eleven", "1.34, 1.35, 1.36"))
        with self.assertRaisesRegex(ValueError, "Unsupported MongoDB Operator release"):
            scraper.parse_compatibility_page(html, {"1.11.0": "1.11.0"})

    def test_missing_kubernetes_versions_fail_closed(self):
        html = table(row("1.11.0", "not documented"))
        with self.assertRaisesRegex(ValueError, "No Kubernetes versions"):
            scraper.parse_compatibility_page(html, {"1.11.0": "1.11.0"})

    def test_duplicate_release_fails_closed(self):
        html = table(row("1.11.0", "1.34, 1.35") + row("1.11.0", "1.34, 1.35"))
        with self.assertRaisesRegex(ValueError, "Duplicate MongoDB Operator"):
            scraper.parse_compatibility_page(html, {"1.11.0": "1.11.0"})

    def test_chart_index_uses_stable_mongodb_kubernetes_versions(self):
        index = b"""
entries:
  mongodb-kubernetes:
    - version: 1.12.0
    - version: 1.11.0
    - version: 1.13.0-rc.1
    - version: nonsense
"""
        self.assertEqual(
            scraper.parse_chart_versions(index),
            {"1.12.0": "1.12.0", "1.11.0": "1.11.0"},
        )

    def test_missing_chart_entries_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "has no 'mongodb-kubernetes' chart entries"):
            scraper.parse_chart_versions(b"entries: {}\n")

    def test_invalid_utf8_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Could not decode"):
            scraper.parse_compatibility_page(b"\xff", {"1.11.0": "1.11.0"})

    def test_scrape_wires_official_sources_to_updater(self):
        index = b"entries:\n  mongodb-kubernetes:\n    - version: 1.11.0\n"
        html = table(row("1.11.0", "1.34, 1.35, 1.36"))

        def fetch(url):
            if url == scraper.chart_index_url:
                return index
            if url == scraper.compatibility_url:
                return html
            self.fail(f"unexpected URL: {url}")

        with (
            patch.object(scraper, "fetch_page", side_effect=fetch),
            patch.object(scraper, "update_compatibility_info") as update,
        ):
            scraper.scrape()

        path, rows = update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/mongodb-kubernetes.yaml")
        self.assertEqual(rows[0]["version"], "1.11.0")
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])


if __name__ == "__main__":
    unittest.main()
