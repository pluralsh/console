import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "kubevela.py"
spec = importlib.util.spec_from_file_location("kubevela_scraper", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

DOC = """# Install KubeVela on Kubernetes

* Kubernetes cluster `>= v1.19 && <= v1.31`
"""

CHART = """apiVersion: v2
name: vela-core
version: 1.11.0
appVersion: 1.11.0
"""


class KubeVelaTests(unittest.TestCase):
    def test_parses_documented_kubernetes_range(self):
        self.assertEqual(scraper.parse_kubernetes_range(DOC), ("1.19", "1.31"))

    def test_missing_range_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "range not found"):
            scraper.parse_kubernetes_range("Kubernetes is required")

    def test_parses_exact_chart_identity(self):
        self.assertEqual(scraper.parse_chart_identity(CHART), ("1.11.0", "1.11.0"))

    def test_mismatched_chart_identity_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "version mismatch"):
            scraper.parse_chart_identity(
                "version: 1.11.0\nappVersion: 1.10.0\n"
            )

    def test_intersects_upstream_range_with_plural_current(self):
        self.assertEqual(
            scraper.intersect_range("1.19", "1.31", "1.36"),
            [f"1.{minor}" for minor in range(31, 18, -1)],
        )
        self.assertEqual(
            scraper.intersect_range("1.19", "1.31", "1.28"),
            [f"1.{minor}" for minor in range(28, 18, -1)],
        )

    def test_latest_stable_release_excludes_prereleases_and_bad_tags(self):
        releases = [
            ("v1.11.0-alpha.6", 3),
            ("v1.10.2", 2),
            ("junk", 1),
            ("v1.11.0", 4),
        ]
        self.assertEqual(scraper.latest_stable_release(releases), "1.11.0")

    def test_build_row_requires_release_chart_match(self):
        row = scraper.build_row("1.11.0", DOC, CHART, "1.36")
        self.assertEqual(row["version"], "1.11.0")
        self.assertEqual(row["chart_version"], "1.11.0")
        self.assertEqual(row["kube"][0], "1.31")
        self.assertEqual(row["kube"][-1], "1.19")

        with self.assertRaisesRegex(ValueError, "release/chart mismatch"):
            scraper.build_row(
                "1.10.0",
                DOC,
                CHART,
                "1.36",
            )

    def test_scrape_wires_official_sources_without_module_leak(self):
        helpers = ModuleType("utils")
        helpers.get_github_releases_timestamps = Mock(
            return_value=[("v1.10.2", 1), ("v1.11.0", 2)]
        )
        helpers.fetch_page = Mock(
            side_effect=lambda url: DOC.encode()
            if url == scraper.DOC_URL
            else CHART.encode()
        )
        helpers.current_kube_version = Mock(return_value="1.36")
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

        helpers.get_github_releases_timestamps.assert_called_once_with(
            "kubevela", "kubevela"
        )
        path, rows = helpers.update_compatibility_info.call_args.args
        self.assertEqual(path, "../../static/compatibilities/kubevela.yaml")
        self.assertEqual(rows[0]["version"], "1.11.0")


if __name__ == "__main__":
    unittest.main()
