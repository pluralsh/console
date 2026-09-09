import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

import yaml


SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "apisix.py"
spec = importlib.util.spec_from_file_location("apisix", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


class ApisixTests(unittest.TestCase):
    def test_parses_tagged_minimum_kubernetes_version(self):
        markdown = """# Apache APISIX for Kubernetes

## Prerequisites

* Kubernetes v1.14+
* Helm v3+
"""
        self.assertEqual(scraper.parse_min_kubernetes(markdown), "1.14")

    def test_missing_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "minimum Kubernetes version not found"):
            scraper.parse_min_kubernetes("# Install\nUse a Kubernetes cluster.")

    def test_expands_minimum_through_plural_current_version(self):
        self.assertEqual(
            scraper.expand_minimum("1.14", "1.17"),
            ["1.17", "1.16", "1.15", "1.14"],
        )

    def test_future_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.18", "1.17")

    def test_groups_stable_charts_by_application_minor_newest_first(self):
        index = """apiVersion: v1
entries:
  apisix:
  - version: 2.16.0
    appVersion: 3.17.0
    annotations: {artifacthub.io/prerelease: "false"}
  - version: 2.17.0
    appVersion: 3.18.0
    annotations: {artifacthub.io/prerelease: "false"}
  - version: 2.16.1
    appVersion: 3.17.0
    annotations: {artifacthub.io/prerelease: "false"}
  - version: 2.15.0-rc1
    appVersion: 3.17.0-rc1
    annotations: {artifacthub.io/prerelease: "true"}
  - version: 2.14.1
    appVersion: 3.16.0
    annotations: {artifacthub.io/prerelease: "false"}
  - version: garbage
    appVersion: unknown
  - version: 2.16.1
    appVersion: 3.17.0
    annotations: {artifacthub.io/prerelease: "false"}
"""
        self.assertEqual(
            scraper.stable_charts_by_app_minor(index),
            [
                [("3.18.0", "2.17.0")],
                [("3.17.0", "2.16.1"), ("3.17.0", "2.16.0")],
                [("3.16.0", "2.14.1")],
            ],
        )

    def test_malformed_chart_metadata_is_ignored(self):
        index = """entries:
  apisix:
  - version: 9.0.0
    appVersion: 9.0.0
    annotations: []
  - version: 2.17.0
    appVersion: 3.18.0
    annotations: {artifacthub.io/prerelease: "false"}
"""
        self.assertEqual(
            scraper.stable_charts_by_app_minor(index),
            [[("3.18.0", "2.17.0")]],
        )

    def test_missing_chart_entries_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "APISIX chart entries not found"):
            scraper.stable_charts_by_app_minor("entries: {}")

    def test_unexpected_entries_structure_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unexpected APISIX Helm index"):
            scraper.stable_charts_by_app_minor("entries: []")

    def test_malformed_index_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Could not parse APISIX Helm index"):
            scraper.stable_charts_by_app_minor("entries: [")

    def test_index_without_stable_releases_fails_closed(self):
        index = """entries:
  apisix:
  - version: 2.18.0-rc1
    appVersion: 3.19.0-rc1
    annotations: {artifacthub.io/prerelease: "true"}
"""
        with self.assertRaisesRegex(ValueError, "No stable APISIX charts found"):
            scraper.stable_charts_by_app_minor(index)

    def test_builds_rows_from_each_matching_chart_tag(self):
        index = """entries:
  apisix:
  - version: 2.17.0
    appVersion: 3.18.0
    annotations: {artifacthub.io/prerelease: "false"}
  - version: 2.16.1
    appVersion: 3.17.0
    annotations: {artifacthub.io/prerelease: "false"}
"""
        documentation = {
            scraper.chart_readme_url.format(chart_version="2.17.0"):
                b"## Prerequisites\n* Kubernetes v1.14+\n",
            scraper.chart_readme_url.format(chart_version="2.16.1"):
                b"## Prerequisites\n* Kubernetes v1.14+\n",
        }

        rows = scraper.build_rows(index, "1.16", documentation.get)

        self.assertEqual(
            rows,
            [
                {
                    "version": "3.18.0",
                    "kube": ["1.16", "1.15", "1.14"],
                    "chart_version": "2.17.0",
                    "requirements": [],
                    "incompatibilities": [],
                },
                {
                    "version": "3.17.0",
                    "kube": ["1.16", "1.15", "1.14"],
                    "chart_version": "2.16.1",
                    "requirements": [],
                    "incompatibilities": [],
                },
            ],
        )

    def test_missing_latest_chart_document_falls_back_within_application_minor(self):
        index = """entries:
  apisix:
  - version: 2.16.1
    appVersion: 3.17.0
  - version: 2.16.0
    appVersion: 3.17.0
"""
        older_url = scraper.chart_readme_url.format(chart_version="2.16.0")
        rows = scraper.build_rows(
            index,
            "1.15",
            lambda url: b"* Kubernetes v1.14+" if url == older_url else None,
        )

        self.assertEqual(
            rows,
            [
                {
                    "version": "3.17.0",
                    "kube": ["1.15", "1.14"],
                    "chart_version": "2.16.0",
                    "requirements": [],
                    "incompatibilities": [],
                }
            ],
        )

    def test_all_tagged_documentation_missing_fails_closed(self):
        index = """entries:
  apisix:
  - version: 2.17.0
    appVersion: 3.18.0
"""
        with self.assertRaisesRegex(ValueError, "No documented APISIX"):
            scraper.build_rows(index, "1.16", lambda _: None)

    def test_invalid_utf8_document_fails_closed(self):
        index = """entries:
  apisix:
  - version: 2.17.0
    appVersion: 3.18.0
"""
        with self.assertRaisesRegex(ValueError, "Could not decode APISIX"):
            scraper.build_rows(index, "1.16", lambda _: b"\xff")

    def test_scrape_writes_rows_from_official_sources(self):
        index = """entries:
  apisix:
  - version: 2.17.0
    appVersion: 3.18.0
"""
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(
            side_effect=lambda url: (
                index.encode()
                if url == scraper.helm_index_url
                else b"* Kubernetes v1.14+"
            )
        )
        helpers.current_kube_version = Mock(return_value="1.16")
        helpers.update_compatibility_info = Mock()

        with patch.dict(sys.modules, {"utils": helpers}):
            scraper.scrape()

        self.assertIsNotNone(helpers.update_compatibility_info.call_args)
        self.assertEqual(
            helpers.update_compatibility_info.call_args.args,
            (
                "../../static/compatibilities/apisix.yaml",
                [
                    {
                        "version": "3.18.0",
                        "kube": ["1.16", "1.15", "1.14"],
                        "chart_version": "2.17.0",
                        "requirements": [],
                        "incompatibilities": [],
                    }
                ],
            ),
        )

    def test_scrape_does_not_write_when_sources_are_incomplete(self):
        index = """entries:
  apisix:
  - version: 2.17.0
    appVersion: 3.18.0
"""
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(
            side_effect=lambda url: (
                index.encode() if url == scraper.helm_index_url else None
            )
        )
        helpers.current_kube_version = Mock(return_value="1.16")
        helpers.update_compatibility_info = Mock()

        with patch.dict(sys.modules, {"utils": helpers}):
            with self.assertRaisesRegex(ValueError, "No documented APISIX"):
                scraper.scrape()

        helpers.update_compatibility_info.assert_not_called()

    def test_catalog_entry_is_registered_and_aggregated(self):
        root = Path(__file__).parents[3]
        manifest = yaml.safe_load(
            (root / "static/compatibilities/manifest.yaml").read_text()
        )
        addon = yaml.safe_load(
            (root / "static/compatibilities/apisix.yaml").read_text()
        )
        aggregate = yaml.safe_load(
            (root / "static/compatibilities.yaml").read_text()
        )

        self.assertIn("apisix", manifest["names"])
        aggregated = next(
            (item for item in aggregate["addons"] if item["name"] == "apisix"),
            None,
        )
        self.assertIsNotNone(aggregated)
        self.assertEqual(
            {key: value for key, value in aggregated.items() if key != "name"},
            addon,
        )


if __name__ == "__main__":
    unittest.main()
