import importlib.util
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "pxc-operator.py"
spec = importlib.util.spec_from_file_location("pxc_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

FIXTURE = """# Versions compatibility

## Cluster components:

| Operator | MySQL |
|:--|:--|
| 1.20.0 | 8.4 |

## Platforms:

| Operator | [GKE](https://gke.example) | [EKS](https://eks.example) | Openshift | [AKS](https://aks.example) | Minikube |
|:--|:--|:--|:--|:--|:--|
| [1.20.0](release-1.20.0.md) | 1.33 - 1.35 | 1.33 - 1.35 | 4.18 - 4.21 | 1.33 - 1.36 | 1.38.1 |
| [1.19.1](release-1.19.1.md) | 1.32 - 1.34 | 1.33 - 1.34 | 4.18 - 4.21 | 1.33 - 1.34 | 1.38.1 |
| [1.19.0](release-1.19.0.md) | 1.31 - 1.33 | 1.32 - 1.34 | 4.17 - 4.20 | 1.32 - 1.34 | 1.37.0 |
| [1.9.0](release-1.9.0.md) | 1.16, 1.20 | 1.19 | 3.11, 4.7 | - | 1.19 |
"""

CHARTS = {
    "1.20.0": "1.20.1",
    "1.19.1": "1.19.1",
    "1.19.0": "1.19.0",
    "1.9.0": "1.9.0",
}


class PxcOperatorTests(unittest.TestCase):
    def test_intersects_gke_eks_and_aks_ranges(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertEqual(rows[0]["version"], "1.20.0")
        self.assertEqual(rows[0]["kube"], ["1.35", "1.34", "1.33"])
        self.assertEqual(rows[1]["kube"], ["1.34", "1.33"])
        self.assertEqual(rows[2]["kube"], ["1.33", "1.32"])

    def test_latest_app_can_map_to_newer_chart_patch(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertEqual(rows[0]["chart_version"], "1.20.1")

    def test_row_without_aks_support_is_not_genericized(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertNotIn("1.9.0", [row["version"] for row in rows])

    def test_missing_platform_section_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "section not found"):
            scraper.parse_platform_matrix("# no matrix", CHARTS)

    def test_unexpected_headers_fail_closed(self):
        broken = FIXTURE.replace("[AKS](https://aks.example)", "Azure")
        with self.assertRaisesRegex(ValueError, "Unexpected Percona"):
            scraper.parse_platform_matrix(broken, CHARTS)

    def test_bad_kubernetes_range_fails_closed(self):
        broken = FIXTURE.replace("1.33 - 1.35", "latest", 1)
        with self.assertRaisesRegex(ValueError, "Unsupported Kubernetes"):
            scraper.parse_platform_matrix(broken, CHARTS)

    def test_reversed_kubernetes_range_fails_closed(self):
        broken = FIXTURE.replace("1.33 - 1.35", "1.35 - 1.33", 1)
        with self.assertRaisesRegex(ValueError, "Reversed Kubernetes"):
            scraper.parse_platform_matrix(broken, CHARTS)

    def test_unpublished_chart_release_is_skipped(self):
        charts = dict(CHARTS)
        del charts["1.19.1"]
        rows = scraper.parse_platform_matrix(FIXTURE, charts)
        self.assertNotIn("1.19.1", [row["version"] for row in rows])

    def test_scrape_connects_official_source_to_shared_updater(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=FIXTURE.encode("utf-8"))
        helpers.get_chart_versions = Mock(return_value=CHARTS)
        helpers.update_compatibility_info = Mock()

        with patch.dict("sys.modules", {"utils": helpers}):
            scraper.scrape()

        helpers.fetch_page.assert_called_once_with(scraper.compatibility_url)
        helpers.get_chart_versions.assert_called_once_with("pxc-operator")
        rows = helpers.update_compatibility_info.call_args.args[1]
        self.assertEqual([row["version"] for row in rows], ["1.20.0", "1.19.1", "1.19.0"])


if __name__ == "__main__":
    unittest.main()
