"""Offline regressions: python -m unittest discover -s tests -p 'test_fluent_operator.py'."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))

spec = importlib.util.spec_from_file_location(
    "fluent_operator_scraper", COMPATIBILITY / "scrapers/fluent-operator.py"
)
scraper = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(scraper)


class FluentOperatorScraperTests(unittest.TestCase):
    def setUp(self):
        self.kube_releases = [
            ("1.33.0", "2025-08-01T00:00:00Z"),
            ("1.34.0", "2026-01-01T00:00:00Z"),
            ("1.35.0", "2026-04-01T00:00:00Z"),
            ("1.36.0", "2026-08-01T00:00:00Z"),
        ]
        self.mock_github_releases = [
            ("v3.10.0", "2026-08-17T13:10:13Z"),
            ("v3.10.0-rc.1", "2026-08-10T00:00:00Z"),
            ("v3.9.0", "2026-06-09T14:24:18Z"),
            ("v3.9.0-alpha.1", "2026-05-15T00:00:00Z"),
            ("v3.8.0", "2026-05-21T16:39:08Z"),
        ]
        self.mock_chart_versions = {
            "3.10.0": "4.3.0",
            "3.10.0-rc.1": "4.3.0-rc.1",
            "3.9.0": "4.2.0",
            "3.8.0": "4.1.0",
        }

    def test_scraper_app_name_and_chart_name(self):
        self.assertEqual(scraper.app_name, "fluent-operator")
        self.assertEqual(scraper.chart_name, "fluent-operator")

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_versions")
    @patch.object(scraper, "get_github_releases_timestamps")
    @patch.object(scraper, "get_kube_release_info")
    def test_scrape_builds_valid_version_list(
        self, mock_kube, mock_gh, mock_charts, mock_update
    ):
        mock_kube.return_value = self.kube_releases
        mock_gh.return_value = self.mock_github_releases
        mock_charts.return_value = self.mock_chart_versions

        scraper.scrape()

        mock_update.assert_called_once()
        args = mock_update.call_args[0]
        filepath, versions = args[0], args[1]

        self.assertEqual(filepath, "../../static/compatibilities/fluent-operator.yaml")
        # Should filter out v3.10.0-rc.1 (even with chart) and v3.9.0-alpha.1
        self.assertFalse(any("rc" in v["version"] or "alpha" in v["version"] for v in versions))
        self.assertEqual(len(versions), 3)

        # Verify newest release using future_release fallback
        v3_10_0 = next(v for v in versions if v["version"] == "3.10.0")
        self.assertEqual(v3_10_0["chart_version"], "4.3.0")
        self.assertEqual(v3_10_0["kube"], ["1.34", "1.35", "1.36"])
        self.assertEqual(v3_10_0["requirements"], [])
        self.assertEqual(v3_10_0["incompatibilities"], [])

        # Verify historical release using future_release boundary
        v3_9_0 = next(v for v in versions if v["version"] == "3.9.0")
        self.assertEqual(v3_9_0["chart_version"], "4.2.0")
        self.assertEqual(v3_9_0["kube"], ["1.34", "1.35", "1.36"])

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_versions")
    @patch.object(scraper, "get_github_releases_timestamps")
    @patch.object(scraper, "get_kube_release_info")
    def test_scrape_skips_releases_without_charts(
        self, mock_kube, mock_gh, mock_charts, mock_update
    ):
        mock_kube.return_value = self.kube_releases
        mock_gh.return_value = [("v3.10.0", "2026-08-17T13:10:13Z"), ("v9.9.9", "2026-08-20T00:00:00Z")]
        mock_charts.return_value = {"3.10.0": "4.3.0"}

        scraper.scrape()

        mock_update.assert_called_once()
        versions = mock_update.call_args[0][1]
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0]["version"], "3.10.0")

    def test_manifest_includes_fluent_operator(self):
        from utils import read_yaml
        manifest_path = COMPATIBILITY.parent.parent / "static/compatibilities/manifest.yaml"
        manifest = read_yaml(str(manifest_path))
        self.assertIsNotNone(manifest)
        self.assertIn("fluent-operator", manifest.get("names", []))

    def test_catalog_yaml_structure_and_images(self):
        from utils import read_yaml
        yaml_path = COMPATIBILITY.parent.parent / "static/compatibilities/fluent-operator.yaml"
        data = read_yaml(str(yaml_path))
        self.assertIsNotNone(data)
        self.assertIn("icon", data)
        self.assertIn("git_url", data)
        self.assertIn("release_url", data)
        self.assertIn("helm_repository_url", data)
        self.assertIn("chart_name", data)
        self.assertIn("versions", data)
        self.assertGreater(len(data["versions"]), 0)

        for v in data["versions"]:
            self.assertIn("version", v)
            self.assertIn("kube", v)
            self.assertIsInstance(v["kube"], list)
            self.assertGreater(len(v["kube"]), 0)
            self.assertIn("chart_version", v)
            self.assertIn("images", v)
            self.assertIsInstance(v["images"], list)
            self.assertGreater(
                len(v["images"]), 0, f"Version {v['version']} has empty images list"
            )
            # Verify no version uses an untagged latest image
            self.assertFalse(
                any(":latest" in img for img in v["images"]),
                f"Version {v['version']} contains unpinned latest image: {v['images']}",
            )
            # Verify Fluent Operator primary workload image is present and version-matched
            vsn = v["version"]
            has_matching_img = any(
                f"fluent-operator:{vsn}" in img or f"fluent-operator:v{vsn}" in img
                for img in v["images"]
            )
            self.assertTrue(
                has_matching_img,
                f"Version {vsn} images do not contain expected fluent-operator:{vsn} image: {v['images']}",
            )

if __name__ == "__main__":
    unittest.main()


