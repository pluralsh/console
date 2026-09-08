import importlib.util
from pathlib import Path
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

SCRAPER_PATH = Path(__file__).parents[1] / "scrapers" / "pg-operator.py"
spec = importlib.util.spec_from_file_location("pg_operator", SCRAPER_PATH)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

FIXTURE = """# Versions compatibility

Cluster components:

| Operator | PostgreSQL |
|:--|:--|
| 3.0.0 | 14 - 18 |

Platforms:

| Operator | [GKE](https://gke.example) | [EKS](https://eks.example) | Openshift | [AKS](https://aks.example) | Minikube |
|:--|:--|:--|:--|:--|:--|
| [3.0.0](release-3.0.0.md) | 1.33 - 1.35 | 1.33 - 1.35 | 4.18 - 4.21 | 1.33 - 1.35 | 1.38.1 |
| [2.9.0](release-2.9.0.md) | 1.32 - 1.34 | 1.33 - 1.35 | 4.17 - 4.21 | 1.33 - 1.35 | 1.38.1 |
| [2.8.2](release-2.8.2.md) | 1.31 - 1.33 | 1.31 - 1.34 | 4.16 - 4.20 | 1.32 - 1.34 | 1.37.0 |
| [2.4.1](release-2.4.1.md) | 1.27 - 1.29 | 1.27 - 1.30 | 4.12 - 4.15 | - | 1.33.1 |

### Notes

| Operator | Note |
|:--|:--|
| 9.9.9 | not compatibility data |
"""

CHARTS = {
    "3.0.0": "3.0.0",
    "2.9.0": "2.9.0",
    "2.8.2": "2.8.2",
    "2.4.1": "2.4.1",
}


class PgOperatorTests(unittest.TestCase):
    def test_intersects_gke_eks_and_aks_ranges(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertEqual(rows[0]["version"], "3.0.0")
        self.assertEqual(rows[0]["kube"], ["1.35", "1.34", "1.33"])
        self.assertEqual(rows[1]["kube"], ["1.34", "1.33"])
        self.assertEqual(rows[2]["kube"], ["1.33", "1.32"])

    def test_row_without_aks_support_is_not_genericized(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertNotIn("2.4.1", [row["version"] for row in rows])

    def test_platform_heading_accepts_markdown_heading_and_optional_colon(self):
        heading_fixture = FIXTURE.replace("Platforms:\n", "## Platforms\n")
        rows = scraper.parse_platform_matrix(heading_fixture, CHARTS)
        self.assertEqual(rows[0]["version"], "3.0.0")

    def test_only_first_contiguous_platform_table_is_parsed(self):
        rows = scraper.parse_platform_matrix(FIXTURE, CHARTS)
        self.assertNotIn("9.9.9", [row["version"] for row in rows])

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

    def test_duplicate_operator_release_fails_closed(self):
        duplicate = FIXTURE.replace(
            "| [2.4.1](release-2.4.1.md)",
            "| [2.8.2](release-2.8.2-duplicate.md)",
        )
        with self.assertRaisesRegex(ValueError, "Duplicate PostgreSQL"):
            scraper.parse_platform_matrix(duplicate, CHARTS)

    def test_unpublished_chart_release_is_skipped(self):
        charts = dict(CHARTS)
        del charts["2.9.0"]
        rows = scraper.parse_platform_matrix(FIXTURE, charts)
        self.assertNotIn("2.9.0", [row["version"] for row in rows])

    def test_scrape_connects_official_source_to_shared_updater(self):
        helpers = ModuleType("utils")
        helpers.fetch_page = Mock(return_value=FIXTURE.encode("utf-8"))
        helpers.get_chart_versions = Mock(return_value=CHARTS)
        helpers.update_compatibility_info = Mock()

        with patch.dict("sys.modules", {"utils": helpers}):
            scraper.scrape()

        helpers.fetch_page.assert_called_once_with(scraper.compatibility_url)
        helpers.get_chart_versions.assert_called_once_with("pg-operator")
        rows = helpers.update_compatibility_info.call_args.args[1]
        self.assertEqual(
            [row["version"] for row in rows],
            ["3.0.0", "2.9.0", "2.8.2"],
        )


if __name__ == "__main__":
    unittest.main()
