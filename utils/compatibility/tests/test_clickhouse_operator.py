import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import utils as real_utils

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "clickhouse-operator.py"
spec = importlib.util.spec_from_file_location("clickhouse_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

DOC_125 = """# Altinity Kubernetes Operator for ClickHouse

Requirements:

 * Kubernetes 1.25+
 * Helm 3.0+
"""

DOC_119_LATER = """## Installation

- Kubernetes 1.19 or later
"""

DOC_NONE = """# Installation

Install the operator with Helm. No version requirements listed.
"""


class ParseMinKubernetesTests(unittest.TestCase):
    def test_parses_bullet_requirement(self):
        self.assertEqual(scraper.parse_min_kubernetes(DOC_125), "1.25")

    def test_parses_or_later_form(self):
        self.assertEqual(scraper.parse_min_kubernetes(DOC_119_LATER), "1.19")

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

    def test_future_minimum_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "newer than Plural"):
            scraper.expand_minimum("1.37", "1.36")

    def test_invalid_versions_fail_closed(self):
        with self.assertRaises(ValueError):
            scraper.expand_minimum("garbage", "1.36")


def readme_for(version, doc):
    return (scraper.README_URL.format(version=version), doc.encode())


class BuildRowsTests(unittest.TestCase):
    def test_builds_rows_from_release_tag_docs(self):
        docs = dict(
            [readme_for("0.27.3", DOC_125), readme_for("0.26.0", DOC_119_LATER)]
        )
        rows = scraper.build_rows(["0.27.3", "0.26.0"], "1.36", docs.get)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(
            by_version["0.27.3"]["kube"], ["1.36", "1.35", "1.34"]
        )
        self.assertEqual(
            by_version["0.26.0"]["kube"], ["1.36", "1.35", "1.34"]
        )
        self.assertEqual(by_version["0.27.3"]["requirements"], [])

    def test_missing_readme_is_skipped(self):
        docs = dict([readme_for("0.27.3", DOC_125)])
        rows = scraper.build_rows(["0.27.3", "0.26.0"], "1.36", docs.get)
        self.assertEqual([row["version"] for row in rows], ["0.27.3"])

    def test_readme_without_requirement_is_skipped(self):
        docs = dict([readme_for("0.27.3", DOC_NONE)])
        rows = scraper.build_rows(["0.27.3"], "1.36", docs.get)
        self.assertEqual(rows, [])

    def test_future_floor_is_skipped_not_lowered(self):
        future = "Requirements:\n\n * Kubernetes 1.37+\n"
        docs = dict([readme_for("0.99.0", future)])
        rows = scraper.build_rows(["0.99.0"], "1.36", docs.get)
        self.assertEqual(rows, [])

    def test_invalid_utf8_readme_is_skipped(self):
        def fetcher(url):
            if url.endswith("release-0.27.3/README.md"):
                return b"\xff\xfe"
            return None
        rows = scraper.build_rows(["0.27.3"], "1.36", fetcher)
        self.assertEqual(rows, [])


class ScrapeWiringTests(unittest.TestCase):
    def test_scrape_wires_official_sources(self):
        with patch.object(
            real_utils, "latest_kube_version", Mock(return_value=Mock(major=1, minor=36))
        ), patch.object(
            real_utils,
            "get_github_releases",
            Mock(return_value=["release-0.27.3", "release-0.27.2", "v9.9.9"]),
        ), patch.object(
            real_utils,
            "fetch_page",
            Mock(
                side_effect=lambda url: DOC_125.encode()
                if url.endswith("release-0.27.3/README.md")
                or url.endswith("release-0.27.2/README.md")
                else None
            ),
        ), patch.object(real_utils, "update_compatibility_info", Mock()), patch.object(
            real_utils, "read_yaml", Mock(return_value={"helm_repository_url": "x"})
        ), patch.object(real_utils, "update_chart_versions", Mock()):
            fresh_spec = importlib.util.spec_from_file_location(
                "clickhouse_operator_wiring", SCRAPER_PATH
            )
            fresh = importlib.util.module_from_spec(fresh_spec)
            fresh_spec.loader.exec_module(fresh)
            fresh.scrape()

        real_utils.latest_kube_version.assert_called_once_with()
        real_utils.get_github_releases.assert_called_once_with(
            "Altinity", "clickhouse-operator"
        )
        path, rows = real_utils.update_compatibility_info.call_args.args
        self.assertEqual(
            path, "../../static/compatibilities/clickhouse-operator.yaml"
        )
        self.assertEqual([row["version"] for row in rows], ["0.27.3", "0.27.2"])
        real_utils.update_chart_versions.assert_called_once_with(
            "clickhouse-operator", "altinity-clickhouse-operator"
        )


if __name__ == "__main__":
    unittest.main()
