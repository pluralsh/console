"""Offline regressions: python -m unittest discover -s tests -p 'test_crossplane.py'."""

import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch, MagicMock

COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))

spec = importlib.util.spec_from_file_location(
    "crossplane_scraper", COMPATIBILITY / "scrapers/crossplane.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


class CrossplaneScraperTests(unittest.TestCase):
    def setUp(self):
        self.kube_releases = [
            ("1.33.0", "2025-08-01T00:00:00Z"),
            ("1.34.0", "2026-01-01T00:00:00Z"),
            ("1.35.0", "2026-04-01T00:00:00Z"),
            ("1.36.0", "2026-08-01T00:00:00Z"),
        ]
        self.mock_github_releases = [
            ("v2.4.0", "2026-08-20T00:00:00Z"),
            ("v2.4.0-rc.1", "2026-08-10T00:00:00Z"),
            ("v2.3.0", "2026-05-01T00:00:00Z"),
            ("v2.3.0-alpha.1", "2026-04-15T00:00:00Z"),
            ("v1.0.0", "2025-01-01T00:00:00Z"),
        ]
        self.mock_chart_versions = {
            "2.4.0": "2.4.0",
            "2.3.0": "2.3.0",
            "1.0.0": "1.0.0",
        }

    def test_scraper_app_name_is_crossplane(self):
        self.assertEqual(scraper.app_name, "crossplane")

    def test_prerelease_filtering(self):
        releases = [("v2.4.0-rc.1", "2026-08-10T00:00:00Z"), ("v2.4.0", "2026-08-20T00:00:00Z")]
        filtered = [r for r in releases if "-" not in r[0]]
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0][0], "v2.4.0")

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

        self.assertEqual(filepath, "../../static/compatibilities/crossplane.yaml")
        # Should exclude v2.4.0-rc.1 and v2.3.0-alpha.1
        self.assertEqual(len(versions), 3)

        v2_4 = next(v for v in versions if v["version"] == "2.4.0")
        self.assertEqual(v2_4["chart_version"], "2.4.0")
        self.assertIn("1.36", v2_4["kube"])
        self.assertIn("1.35", v2_4["kube"])
        self.assertIn("1.34", v2_4["kube"])
        self.assertEqual(v2_4["requirements"], [])
        self.assertEqual(v2_4["incompatibilities"], [])

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_versions")
    @patch.object(scraper, "get_github_releases_timestamps")
    @patch.object(scraper, "get_kube_release_info")
    def test_scrape_skips_releases_without_charts(
        self, mock_kube, mock_gh, mock_charts, mock_update
    ):
        mock_kube.return_value = self.kube_releases
        mock_gh.return_value = [("v2.4.0", "2026-08-20T00:00:00Z"), ("v9.9.9", "2026-08-20T00:00:00Z")]
        # Only 2.4.0 has a chart
        mock_charts.return_value = {"2.4.0": "2.4.0"}

        scraper.scrape()

        mock_update.assert_called_once()
        versions = mock_update.call_args[0][1]
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0]["version"], "2.4.0")


if __name__ == "__main__":
    unittest.main()
