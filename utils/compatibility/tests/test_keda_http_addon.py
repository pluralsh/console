"""Offline regressions: python -m unittest discover -s tests -p 'test_keda_http_addon.py'."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))

spec = importlib.util.spec_from_file_location(
    "keda_http_addon_scraper", COMPATIBILITY / "scrapers/keda-http-addon.py"
)
scraper = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(scraper)


class KedaHttpAddonScraperTests(unittest.TestCase):
    def setUp(self):
        self.kube_releases = [
            ("1.33.0", "2025-08-01T00:00:00Z"),
            ("1.34.0", "2026-01-01T00:00:00Z"),
            ("1.35.0", "2026-04-01T00:00:00Z"),
            ("1.36.0", "2026-08-01T00:00:00Z"),
        ]
        self.mock_github_releases = [
            ("v0.15.0", "2026-08-20T00:00:00Z"),
            ("v0.15.0-rc.1", "2026-08-10T00:00:00Z"),
            ("v0.14.0", "2026-05-01T00:00:00Z"),
            ("v0.14.0-alpha.1", "2026-04-15T00:00:00Z"),
            ("v0.13.0", "2026-01-01T00:00:00Z"),
        ]
        self.mock_chart_versions = {
            "0.15.0": "0.15.0",
            "0.14.0": "0.14.1",
            "0.13.0": "0.13.0",
        }

    def test_scraper_app_name_and_chart_name(self):
        self.assertEqual(scraper.app_name, "keda-http-addon")
        self.assertEqual(scraper.chart_name, "keda-add-ons-http")

    def test_prerelease_filtering(self):
        releases = [("v0.15.0-rc.1", "2026-08-10T00:00:00Z"), ("v0.15.0", "2026-08-20T00:00:00Z")]
        filtered = [
            r for r in releases
            if "-" not in r[0] and not any(pre in r[0].lower() for pre in ["rc", "alpha", "beta"])
        ]
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0][0], "v0.15.0")

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

        self.assertEqual(filepath, "../../static/compatibilities/keda-http-addon.yaml")
        # Should filter out v0.15.0-rc.1 and v0.14.0-alpha.1
        self.assertEqual(len(versions), 3)

        v0_15 = next(v for v in versions if v["version"] == "0.15.0")
        self.assertEqual(v0_15["chart_version"], "0.15.0")
        self.assertIn("1.36", v0_15["kube"])
        self.assertIn("1.35", v0_15["kube"])
        self.assertIn("1.34", v0_15["kube"])
        self.assertEqual(v0_15["requirements"], [])
        self.assertEqual(v0_15["incompatibilities"], [])

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_versions")
    @patch.object(scraper, "get_github_releases_timestamps")
    @patch.object(scraper, "get_kube_release_info")
    def test_scrape_skips_releases_without_charts(
        self, mock_kube, mock_gh, mock_charts, mock_update
    ):
        mock_kube.return_value = self.kube_releases
        mock_gh.return_value = [("v0.15.0", "2026-08-20T00:00:00Z"), ("v9.9.9", "2026-08-20T00:00:00Z")]
        mock_charts.return_value = {"0.15.0": "0.15.0"}

        scraper.scrape()

        mock_update.assert_called_once()
        versions = mock_update.call_args[0][1]
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0]["version"], "0.15.0")

    def test_manifest_includes_keda_http_addon(self):
        from utils import read_yaml
        manifest_path = COMPATIBILITY.parent.parent / "static/compatibilities/manifest.yaml"
        manifest = read_yaml(str(manifest_path))
        self.assertIsNotNone(manifest)
        self.assertIn("keda-http-addon", manifest.get("names", []))

    def test_catalog_yaml_structure_and_images(self):
        from utils import read_yaml
        yaml_path = COMPATIBILITY.parent.parent / "static/compatibilities/keda-http-addon.yaml"
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
            # Verify KEDA HTTP Add-on primary workload image is present
            has_keda_http_img = any("http-add-on" in img for img in v["images"])
            self.assertTrue(
                has_keda_http_img,
                f"Version {v['version']} images do not contain expected http-add-on workload image: {v['images']}"
            )


if __name__ == "__main__":
    unittest.main()
