import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "kuberay-operator.py"
spec = importlib.util.spec_from_file_location("kuberay_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

INDEX = """apiVersion: v1
entries:
  kuberay-operator:
  - version: 1.7.0
  - version: 1.6.1
  - version: 1.6.2
  - version: 1.6.0-rc.0
  - version: 1.0.0
  - version: 0.6.0
  - version: 0.6.1
  - version: 0.4.0
  - version: 0.3.0
  - version: garbage
"""

DOC_123 = """# Installation

Make sure your Kubernetes cluster and Kubectl are both at version at least 1.23.
"""

DOC_119 = """## Installation

Make sure your Kubernetes cluster and Kubectl are both at version at least 1.19.
"""


class KubeRayOperatorTests(unittest.TestCase):
    def test_parses_tagged_minimum_kubernetes_version(self):
        self.assertEqual(scraper.parse_min_kubernetes(DOC_123), "1.23")

    def test_missing_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "minimum Kubernetes version not found"):
            scraper.parse_min_kubernetes("# Installation\nUse Kubernetes.")

    def test_expands_minimum_through_plural_current_version(self):
        self.assertEqual(
            scraper.expand_minimum("1.23", "1.26"),
            ["1.26", "1.25", "1.24", "1.23"],
        )

    def test_future_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.27", "1.26")

    def test_groups_stable_charts_by_minor_newest_first(self):
        self.assertEqual(
            scraper.stable_charts_by_minor(INDEX),
            [
                [("1.7.0", "1.7.0")],
                [("1.6.2", "1.6.2"), ("1.6.1", "1.6.1")],
                [("1.0.0", "1.0.0")],
                [("0.6.1", "0.6.1"), ("0.6.0", "0.6.0")],
                [("0.4.0", "0.4.0")],
            ],
        )

    def test_missing_operator_entries_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "chart entries not found"):
            scraper.stable_charts_by_minor("entries: {}")

    def test_build_rows_uses_each_release_tag_documentation(self):
        docs = {
            scraper.installation_url.format(version="1.7.0"): DOC_123.encode(),
            scraper.installation_url.format(version="1.6.2"): DOC_123.encode(),
            scraper.installation_url.format(version="1.0.0"): DOC_119.encode(),
            scraper.installation_url.format(version="0.6.1"): DOC_119.encode(),
            scraper.installation_url.format(version="0.4.0"): DOC_119.encode(),
        }

        rows = scraper.build_rows(INDEX, "1.26", docs.get)
        by_version = {row["version"]: row for row in rows}

        self.assertEqual(
            by_version["1.7.0"]["kube"],
            ["1.26", "1.25", "1.24", "1.23"],
        )
        self.assertEqual(
            by_version["1.0.0"]["kube"],
            ["1.26", "1.25", "1.24", "1.23", "1.22", "1.21", "1.20", "1.19"],
        )
        self.assertEqual(by_version["1.6.2"]["chart_version"], "1.6.2")

    def test_missing_latest_patch_falls_back_to_documented_patch_same_minor(self):
        docs = {
            scraper.installation_url.format(version="1.7.0"): DOC_123,
            scraper.installation_url.format(version="1.6.2"): DOC_123,
            scraper.installation_url.format(version="1.0.0"): DOC_119,
            # 0.6.1 intentionally absent; 0.6.0 is authoritative fallback.
            scraper.installation_url.format(version="0.6.0"): DOC_119,
            scraper.installation_url.format(version="0.4.0"): DOC_119,
        }
        rows = scraper.build_rows(INDEX, "1.26", docs.get)
        by_version = {row["version"]: row for row in rows}
        self.assertIn("0.6.0", by_version)
        self.assertNotIn("0.6.1", by_version)
        self.assertEqual(by_version["0.6.0"]["chart_version"], "0.6.0")

    def test_minor_without_any_tagged_documentation_is_skipped(self):
        docs = {
            scraper.installation_url.format(version="1.7.0"): DOC_123,
        }
        rows = scraper.build_rows(INDEX, "1.26", docs.get)
        self.assertEqual([row["version"] for row in rows], ["1.7.0"])

    def test_all_tagged_documentation_missing_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "No documented KubeRay"):
            scraper.build_rows(INDEX, "1.26", lambda _: None)

    def test_invalid_utf8_existing_document_fails_closed(self):
        def fetcher(url):
            if url.endswith("v1.7.0/docs/deploy/installation.md"):
                return b"\xff"
            return None

        with self.assertRaisesRegex(ValueError, "Could not decode"):
            scraper.build_rows(INDEX, "1.26", fetcher)

    def test_scrape_wires_official_sources_without_module_leak(self):
        reduced_index = """entries:
  kuberay-operator:
  - version: 1.7.0
"""
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(
            side_effect=lambda url: (
                reduced_index.encode()
                if url == scraper.helm_index_url
                else DOC_123.encode()
            )
        )
        helpers.current_kube_version = Mock(return_value="1.26")
        helpers.update_compatibility_info = Mock()

        previous = sys.modules.get("utils")
        try:
            with patch.dict(sys.modules, {"utils": helpers}):
                scraper.scrape()
        finally:
            if previous is None:
                sys.modules.pop("utils", None)
            else:
                sys.modules["utils"] = previous

        helpers.current_kube_version.assert_called_once_with()
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(
            path,
            "../../static/compatibilities/kuberay-operator.yaml",
        )
        self.assertEqual(rows[0]["version"], "1.7.0")
        self.assertEqual(rows[0]["chart_version"], "1.7.0")

    def test_bad_index_payload_type_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unexpected KubeRay Helm index"):
            scraper.stable_charts_by_minor(object())


if __name__ == "__main__":
    unittest.main()
