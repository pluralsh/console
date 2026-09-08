import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


COMPATIBILITY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY))
spec = importlib.util.spec_from_file_location(
    "seldon_core_scraper", COMPATIBILITY / "scrapers/seldon-core.py"
)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
FIXTURE = Path(__file__).parent / "fixtures/seldon-core-installation.md"


class SeldonCoreTests(unittest.TestCase):
    def test_matrix_preserves_only_exact_checked_cells(self):
        matrix = scraper.parse_compatibility_matrix(FIXTURE.read_bytes())
        self.assertEqual(matrix, {
            "1.16.0": ["1.23", "1.24", "1.25", "1.26", "1.27"],
            "1.17.0": ["1.23", "1.24", "1.25", "1.26", "1.27"],
            "1.18.0": ["1.23", "1.24", "1.25", "1.26", "1.27"],
            "1.19.0": [
                "1.23", "1.24", "1.25", "1.26", "1.27", "1.28", "1.29",
                "1.30", "1.31", "1.32", "1.33", "1.34", "1.35",
            ],
        })

    def test_blank_cells_are_supported_and_not_extrapolated(self):
        content = (
            "| Core Version \\\\ K8s Version | 1.23 | 1.24 | 1.25 |\n"
            "| --- | --- | --- | --- |\n"
            "| 1.19 | ✓ |   | ✓ |\n"
        )
        self.assertEqual(
            scraper.parse_compatibility_matrix(content),
            {"1.19.0": ["1.23", "1.25"]},
        )

    def test_missing_chart_mapping_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "No Helm chart mapping"):
            scraper.extract_table_data(
                {"1.18.0": ["1.23"]}, {"1.19.0": "1.19.0"}
            )

    def test_chart_rows_use_stable_app_versions_in_documented_minors(self):
        rows = scraper.extract_table_data(
            {"1.18.0": ["1.23"]},
            {
                "1.18.2": "1.18.2",
                "1.18.1": "1.18.1",
                "1.18.0": "1.18.0",
                "1.18.0-rc.1": "1.18.0-rc.1",
                "1.19.0": "1.19.0",
            },
        )
        self.assertEqual(
            [(row["version"], row["chart_version"]) for row in rows],
            [("1.18.2", "1.18.2")],
        )

    def test_malformed_or_missing_table_does_not_write_existing_file(self):
        malformed = b"| Core Version \\\\ K8s Version | 1.23 |\n| --- | --- |\n"
        missing = b"# Install in Kubernetes\n\nNo matrix here.\n"
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "seldon-core.yaml"
            target.write_text("sentinel: keep\n", encoding="utf-8")
            for source in (malformed, missing):
                with self.subTest(source=source), patch.object(scraper, "TARGET_FILE", str(target)), \
                        patch.object(scraper, "fetch_page", return_value=source), \
                        patch.object(scraper, "print_error"), \
                        patch.object(scraper, "update_compatibility_info") as update:
                    scraper.scrape()
                update.assert_not_called()
                self.assertEqual(target.read_text(encoding="utf-8"), "sentinel: keep\n")

    def test_scrape_builds_rows_from_source_and_chart_pipeline(self):
        matrix = scraper.parse_compatibility_matrix(FIXTURE.read_bytes())
        charts = {version: version for version in matrix}
        with patch.object(scraper, "fetch_page", return_value=FIXTURE.read_bytes()), \
                patch.object(scraper, "get_chart_versions", return_value=charts) as get_charts, \
                patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
        get_charts.assert_called_once_with(scraper.APP_NAME, scraper.CHART_NAME)
        update.assert_called_once_with(scraper.TARGET_FILE, [
            {
                "version": "1.16.0", "kube": ["1.23", "1.24", "1.25", "1.26", "1.27"],
                "chart_version": "1.16.0", "images": [], "requirements": [],
                "incompatibilities": [],
            },
            {
                "version": "1.17.0", "kube": ["1.23", "1.24", "1.25", "1.26", "1.27"],
                "chart_version": "1.17.0", "images": [], "requirements": [],
                "incompatibilities": [],
            },
            {
                "version": "1.18.0", "kube": ["1.23", "1.24", "1.25", "1.26", "1.27"],
                "chart_version": "1.18.0", "images": [], "requirements": [],
                "incompatibilities": [],
            },
            {
                "version": "1.19.0", "kube": [
                    "1.23", "1.24", "1.25", "1.26", "1.27", "1.28", "1.29",
                    "1.30", "1.31", "1.32", "1.33", "1.34", "1.35",
                ],
                "chart_version": "1.19.0", "images": [], "requirements": [],
                "incompatibilities": [],
            },
        ])


if __name__ == "__main__":
    unittest.main()
