import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import utils as real_utils

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "opensearch.py"
spec = importlib.util.spec_from_file_location("opensearch_scraper", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

DOC_119 = """# OpenSearch Helm Chart

## Kubernetes Version Support
* This helm-chart repository is tested with kubernetes version 1.19 and above

## Installation
"""

DOC_PLUS = """# OpenSearch Helm Chart

Requirements:

 * Kubernetes 1.25+
"""

DOC_NONE = """# OpenSearch Helm Chart

## Installation
helm repo add opensearch https://opensearch-project.github.io/helm-charts
"""

INDEX_DOC = {
    "entries": {
        "opensearch": [
            {"version": "3.8.0", "appVersion": "3.8.0"},
            {"version": "3.7.0", "appVersion": "3.7.0"},
            {"version": "2.38.0", "appVersion": "2.19.6"},
            {"version": "2.37.0", "appVersion": "2.19.5"},
            {"version": "2.36.0", "appVersion": "2.19.5"},
            {"version": "3.6.0", "appVersion": "3.6.0"},
        ]
    }
}


class ParseMinKubernetesTests(unittest.TestCase):
    def test_parses_tested_with_statement(self):
        self.assertEqual(scraper.parse_min_kubernetes(DOC_119), "1.19")

    def test_parses_plus_statement(self):
        self.assertEqual(scraper.parse_min_kubernetes(DOC_PLUS), "1.25")

    def test_missing_requirement_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Kubernetes requirement not found"):
            scraper.parse_min_kubernetes(DOC_NONE)


class ExpandMinimumTests(unittest.TestCase):
    def test_tracks_three_newest_minors_newest_first(self):
        self.assertEqual(
            scraper.expand_minimum("1.25", "1.36"),
            ["1.36", "1.35", "1.34"],
        )

    def test_ancient_floor_still_tracks_three_newest_minors(self):
        self.assertEqual(
            scraper.expand_minimum("1.19", "1.36"),
            ["1.36", "1.35", "1.34"],
        )

    def test_floor_equal_to_latest_does_not_overshoot(self):
        self.assertEqual(scraper.expand_minimum("1.36", "1.36"), ["1.36"])

    def test_narrow_window_returns_full_range(self):
        self.assertEqual(scraper.expand_minimum("1.19", "1.20"), ["1.20", "1.19"])

    def test_two_digit_minor_boundary_compares_numerically(self):
        # "1.9" > "1.10" lexicographically; version compare must keep 1.9.
        self.assertEqual(scraper.expand_minimum("1.9", "1.10"), ["1.10", "1.9"])

    def test_future_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.37", "1.36")

    def test_invalid_versions_fail_closed(self):
        with self.assertRaises(ValueError):
            scraper.expand_minimum("garbage", "1.36")


class ServerReleasesTests(unittest.TestCase):
    def test_driven_by_helm_index_newest_first(self):
        self.assertEqual(
            scraper.server_releases(INDEX_DOC),
            [
                ("3.8.0", "opensearch-3.8.0"),
                ("3.7.0", "opensearch-3.7.0"),
                ("2.19.6", "opensearch-2.38.0"),
                ("2.19.5", "opensearch-2.37.0"),
                ("3.6.0", "opensearch-3.6.0"),
            ],
        )

    def test_chart_version_numbers_are_not_server_versions(self):
        # Chart 2.38.0 packages server 2.19.6, not "2.38.0".
        rows = scraper.server_releases(INDEX_DOC)
        self.assertIn(("2.19.6", "opensearch-2.38.0"), rows)
        self.assertNotIn("2.38.0", [r[0] for r in rows])

    def test_duplicate_server_versions_keep_newest_chart(self):
        # 2.19.5 is packaged by 2.37.0 (newer) and 2.36.0.
        rows = scraper.server_releases(INDEX_DOC)
        self.assertEqual(
            [r for r in rows if r[0] == "2.19.5"],
            [("2.19.5", "opensearch-2.37.0")],
        )

    def test_max_releases_cap(self):
        big = {
            "entries": {
                "opensearch": [
                    {"version": f"9.{i}.0", "appVersion": f"9.{i}.0"}
                    for i in range(scraper.MAX_RELEASES + 5)
                ]
            }
        }
        self.assertEqual(len(scraper.server_releases(big)), scraper.MAX_RELEASES)

    def test_missing_chart_is_empty(self):
        self.assertEqual(scraper.server_releases({}), [])

    def test_none_document_is_empty(self):
        self.assertEqual(scraper.server_releases(None), [])


class BuildRowsTests(unittest.TestCase):
    def docs(self, tags):
        return {
            scraper.README_URL.format(
                owner="opensearch-project", name="helm-charts", commitish=t
            ): d.encode()
            for t, d in zip(tags, [DOC_119, DOC_PLUS, DOC_NONE])
        }

    def test_builds_rows_from_release_docs(self):
        releases = [("3.8.0", "opensearch-3.8.0"), ("3.7.0", "opensearch-3.7.0")]
        rows = scraper.build_rows(releases, "1.36", self.docs([
            "opensearch-3.8.0", "opensearch-3.7.0"
        ]).get)
        self.assertEqual([r["version"] for r in rows], ["3.8.0", "3.7.0"])
        self.assertEqual(rows[0]["kube"], ["1.36", "1.35", "1.34"])
        self.assertEqual(rows[1]["kube"], ["1.36", "1.35", "1.34"])

    def test_readme_without_requirement_is_skipped(self):
        releases = [
            ("3.8.0", "opensearch-3.8.0"),
            ("3.7.0", "opensearch-3.7.0"),
            ("3.6.0", "opensearch-3.6.0"),
        ]
        rows = scraper.build_rows(releases, "1.36", self.docs([
            "opensearch-3.8.0", "opensearch-3.7.0", "opensearch-3.6.0"
        ]).get)
        self.assertEqual([r["version"] for r in rows], ["3.8.0", "3.7.0"])

    def test_prerelease_tag_fallback(self):
        # opensearch-3.7.0 tag does not exist; the -1 tag does.
        docs = {
            scraper.README_URL.format(
                owner="opensearch-project", name="helm-charts",
                commitish="opensearch-3.7.0-1",
            ): DOC_119.encode()
        }
        rows = scraper.build_rows(
            [("3.7.0", "opensearch-3.7.0")], "1.36", docs.get
        )
        self.assertEqual([r["version"] for r in rows], ["3.7.0"])

    def test_missing_readme_is_skipped(self):
        rows = scraper.build_rows(
            [("3.8.0", "opensearch-3.8.0")], "1.36", lambda url: None
        )
        self.assertEqual(rows, [])

    def test_invalid_utf8_readme_is_skipped(self):
        def fetcher(url):
            if url.endswith("/opensearch-3.8.0/README.md"):
                return b"\xff\xfe"
            return None
        rows = scraper.build_rows(
            [("3.8.0", "opensearch-3.8.0")], "1.36", fetcher
        )
        self.assertEqual(rows, [])

    def test_future_floor_is_skipped_not_lowered(self):
        future = "Requirements:\n\n * Kubernetes 1.37+\n"
        rows = scraper.build_rows(
            [("3.99.0", "opensearch-3.99.0")], "1.36", lambda url: future.encode()
        )
        self.assertEqual(rows, [])


class ScrapeWiringTests(unittest.TestCase):
    INDEX_BYTES = (
        b"entries:\n"
        b"  opensearch:\n"
        b"    - version: 3.8.0\n"
        b"      appVersion: 3.8.0\n"
        b"    - version: 3.7.0\n"
        b"      appVersion: 3.7.0\n"
    )

    def test_scrape_wires_official_sources(self):
        mock_latest = Mock(return_value=Mock(major=1, minor=36))

        def fake_fetch(url):
            if url.endswith("/index.yaml"):
                return self.INDEX_BYTES
            if url.endswith("/README.md"):
                return DOC_119.encode()
            return None

        mock_update = Mock()
        mock_read_yaml = Mock(return_value={"helm_repository_url": "x"})
        mock_charts = Mock()
        with patch.object(real_utils, "latest_kube_version", mock_latest), patch.object(
            real_utils, "fetch_page", side_effect=fake_fetch
        ), patch.object(real_utils, "update_compatibility_info", mock_update), patch.object(
            real_utils, "read_yaml", mock_read_yaml
        ), patch.object(real_utils, "update_chart_versions", mock_charts):
            fresh_spec = importlib.util.spec_from_file_location(
                "opensearch_wiring", SCRAPER_PATH
            )
            fresh = importlib.util.module_from_spec(fresh_spec)
            fresh_spec.loader.exec_module(fresh)
            fresh.scrape()

        mock_latest.assert_called_once_with()
        path, rows = mock_update.call_args.args
        self.assertEqual(path, "../../static/compatibilities/opensearch.yaml")
        self.assertEqual([row["version"] for row in rows], ["3.8.0", "3.7.0"])
        mock_charts.assert_called_once_with("opensearch", "opensearch")


if __name__ == "__main__":
    unittest.main()
