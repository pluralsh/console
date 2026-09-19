"""Offline regressions: python -m unittest discover -s tests -p 'test_node_problem_detector.py'."""

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))

spec = importlib.util.spec_from_file_location(
    "node_problem_detector_scraper",
    COMPATIBILITY / "scrapers/node-problem-detector.py",
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)


class NodeProblemDetectorScraperTests(unittest.TestCase):
    def test_parse_aligned_release_tag(self):
        self.assertEqual(scraper.parse_release_tag("v1.36.0"), ("1.36.0", "1.36"))
        self.assertEqual(scraper.parse_release_tag("v1.34.12"), ("1.34.12", "1.34"))

    def test_reject_legacy_and_prerelease_tags(self):
        for tag in ("v0.8.25", "v1.37.0-alpha.1", "v2.0.0", "not-a-version"):
            self.assertIsNone(scraper.parse_release_tag(tag))

    def test_latest_chart_versions_keeps_newest_chart_per_app(self):
        entries = [
            {"appVersion": "v1.35.1", "version": "2.4.0"},
            {"appVersion": "v1.35.1", "version": "2.4.1"},
            {"appVersion": "v0.8.25", "version": "2.3.25"},
            {"appVersion": "v1.34.0", "version": "2.3.20-rc.1"},
        ]

        self.assertEqual(
            scraper._latest_chart_versions(entries),
            {"1.35.1": "2.4.1"},
        )

    def test_build_rows_maps_each_minor_and_keeps_release_order(self):
        rows = scraper.build_rows(
            ["v1.34.4", "v1.36.0", "v1.35.3"],
            {"1.35.1": "2.4.1"},
        )

        self.assertEqual([row["version"] for row in rows], [
            "1.36.0",
            "1.35.3",
            "1.34.4",
        ])
        self.assertEqual(rows[0]["kube"], ["1.36"])
        self.assertEqual(rows[1]["kube"], ["1.35"])
        self.assertNotIn("chart_version", rows[1])
        self.assertEqual(
            rows[1]["images"],
            ["registry.k8s.io/node-problem-detector/node-problem-detector:v1.35.3"],
        )

    @patch.object(scraper, "get_chart_versions", return_value={})
    @patch.object(scraper, "get_stable_release_tags")
    def test_scrape_fails_closed_without_releases(
        self, mock_tags, _mock_charts
    ):
        mock_tags.return_value = []
        with patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
            update.assert_not_called()

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_versions")
    @patch.object(scraper, "get_stable_release_tags")
    def test_scrape_writes_expected_rows(
        self, mock_tags, mock_charts, mock_update
    ):
        mock_tags.return_value = ["v1.34.4", "v1.35.3", "v1.36.0"]
        mock_charts.return_value = {"1.35.1": "2.4.1"}

        scraper.scrape()

        mock_update.assert_called_once()
        filepath, rows = mock_update.call_args[0]
        self.assertEqual(
            filepath,
            "../../static/compatibilities/node-problem-detector.yaml",
        )
        self.assertEqual([row["version"] for row in rows], [
            "1.36.0",
            "1.35.3",
            "1.34.4",
        ])

    def test_release_page_parser_accepts_github_payload(self):
        payload = json.dumps(
            [
                {"tag_name": "v1.36.0", "draft": False, "prerelease": False},
                {"tag_name": "v1.37.0-alpha.1", "draft": False, "prerelease": True},
                {"tag_name": "v0.8.25", "draft": False, "prerelease": False},
            ]
        ).encode()
        with patch.object(scraper, "fetch_page", side_effect=[payload, b""]):
            self.assertEqual(scraper.get_stable_release_tags(), ["v1.36.0"])


if __name__ == "__main__":
    unittest.main()
