import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "redis-enterprise-operator.py"
spec = importlib.util.spec_from_file_location("redis_enterprise_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

FIXTURE = """## Kubernetes version support

### Version history

{{<table-scrollable>}}|  | Redis operator | **<nobr>8.2.0-12</nobr>** | **<nobr>8.0.20-21</nobr>** | **<nobr>8.0.2-2</nobr>** | **<nobr>7.22.2-21</nobr>** | **<nobr>7.22.0-15</nobr>** | **<nobr>7.22.0-7</nobr>** |
|---|---|---|---|---|---|---|---|
|  |  | July 2026 | May 2026 | Oct 2025 | Oct 2025 | July 2025 | April 2025 |
| OpenShift | Kubernetes |  |  |  |  |  |  |
| &mdash; | 1.36 | <span title="Supported">&#x2705;</span> |  |  |  |  |  |
| 4.22 | 1.35 | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> |  |  |  |  |
| 4.21 | 1.34 | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> |  |  |  |
| 4.20 | 1.33 | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> |  |
| 4.19 | 1.32 | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> |
| 4.18 | 1.31 | <span title="X icon">&#x274c;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> | <span title="Supported">&#x2705;</span> |
| 4.17 | 1.30 |  |  | <span title="X icon">&#x274c;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> |
{{</table-scrollable>}}
"""

CHARTS = {
    "8.2.0-12": "8.2.0-12",
    "8.0.20-21": "8.0.20-21",
    "8.0.2-2": "8.0.2-2",
    "7.22.2-21": "7.22.2-21",
    "7.22.0-15": "7.22.0-15",
    "7.22.0-7": "7.22.0-7",
}


class RedisEnterpriseOperatorTests(unittest.TestCase):
    def test_supported_and_deprecated_are_included_but_eol_is_not(self):
        rows = scraper.parse_support_matrix(FIXTURE, CHARTS)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(
            by_version["8.2.0"]["kube"],
            ["1.36", "1.35", "1.34", "1.33", "1.32"],
        )
        self.assertNotIn("1.31", by_version["8.2.0"]["kube"])

    def test_kubernetes_versions_are_sorted_descending(self):
        rows = scraper.parse_support_matrix(FIXTURE, CHARTS)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(
            by_version["7.22.2"]["kube"],
            ["1.33", "1.32", "1.31", "1.30"],
        )

    def test_exact_chart_mapping_is_attached_while_app_version_is_stable_semver(self):
        rows = scraper.parse_support_matrix(FIXTURE, CHARTS)
        self.assertEqual(rows[0]["version"], "8.2.0")
        self.assertEqual(rows[0]["chart_version"], "8.2.0-12")

    def test_newest_documented_build_wins_for_same_semver(self):
        rows = scraper.parse_support_matrix(FIXTURE, CHARTS)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(by_version["7.22.0"]["chart_version"], "7.22.0-15")
        self.assertEqual(
            by_version["7.22.0"]["kube"],
            ["1.33", "1.32", "1.31", "1.30"],
        )

    def test_missing_newest_chart_falls_back_to_documented_older_build(self):
        charts = dict(CHARTS)
        del charts["7.22.0-15"]
        rows = scraper.parse_support_matrix(FIXTURE, charts)
        by_version = {row["version"]: row for row in rows}
        self.assertEqual(by_version["7.22.0"]["chart_version"], "7.22.0-7")
        self.assertEqual(
            by_version["7.22.0"]["kube"],
            ["1.32", "1.31", "1.30"],
        )

    def test_unpublished_chart_release_is_skipped(self):
        charts = dict(CHARTS)
        del charts["8.0.2-2"]
        rows = scraper.parse_support_matrix(FIXTURE, charts)
        self.assertNotIn("8.0.2", [row["version"] for row in rows])

    def test_missing_version_history_header_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "header not found"):
            scraper.parse_support_matrix("# no version history", CHARTS)

    def test_missing_kubernetes_rows_fails_closed(self):
        broken = FIXTURE.replace("| OpenShift | Kubernetes |", "| Platform | K8s |")
        with self.assertRaisesRegex(ValueError, "rows not found"):
            scraper.parse_support_matrix(broken, CHARTS)

    def test_unknown_status_marker_fails_closed(self):
        broken = FIXTURE.replace(
            '<span title="Supported">&#x2705;</span>',
            '<span title="Maybe">?</span>',
            1,
        )
        with self.assertRaisesRegex(ValueError, "Unexpected Redis Kubernetes support"):
            scraper.parse_support_matrix(broken, CHARTS)

    def test_short_row_fails_closed(self):
        original = '| 4.17 | 1.30 |  |  | <span title="X icon">&#x274c;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> | <span title="Deprecation warning">&#x26a0;</span> |'
        broken = FIXTURE.replace(original, '| 4.17 | 1.30 |  |  |')
        with self.assertRaisesRegex(ValueError, "column count"):
            scraper.parse_support_matrix(broken, CHARTS)

    def test_duplicate_operator_header_fails_closed(self):
        broken = FIXTURE.replace(
            "**<nobr>7.22.2-21</nobr>**",
            "**<nobr>8.2.0-12</nobr>**",
        )
        with self.assertRaisesRegex(ValueError, "Duplicate Redis operator"):
            scraper.parse_support_matrix(broken, CHARTS)

    def test_no_chart_matches_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "matched official Helm"):
            scraper.parse_support_matrix(FIXTURE, {})

    def test_scrape_wires_official_source_and_shared_updater_without_module_leak(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=FIXTURE.encode("utf-8"))
        helpers.get_chart_versions = Mock(return_value=CHARTS)
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

        helpers.fetch_page.assert_called_once_with(scraper.compatibility_url)
        helpers.get_chart_versions.assert_called_once_with("redis-enterprise-operator")
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(
            path,
            "../../static/compatibilities/redis-enterprise-operator.yaml",
        )
        self.assertEqual(
            [row["version"] for row in rows],
            ["8.2.0", "8.0.20", "8.0.2", "7.22.2", "7.22.0"],
        )


if __name__ == "__main__":
    unittest.main()
