import importlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
karmada = importlib.import_module("scrapers.karmada")
utils = importlib.import_module("utils")
FIXTURES = Path(__file__).parent / "fixtures"
MATRIX = (FIXTURES / "karmada-compatibility.md").read_text()
CHART_INDEX = (FIXTURES / "karmada-chart-index.yaml").read_bytes()
METADATA = {
    "helm_repository_url": "https://raw.githubusercontent.com/karmada-io/karmada/master/charts",
    "chart_name": "karmada",
    "versions": [],
}


def chart_versions():
    with patch.object(utils, "read_yaml", return_value=METADATA), patch.object(
        utils, "fetch_page", return_value=CHART_INDEX
    ) as fetch:
        result = utils.get_chart_versions("karmada")
        fetch.assert_called_once_with(METADATA["helm_repository_url"] + "/index.yaml")
        return result


class KarmadaTests(unittest.TestCase):
    def test_official_matrix_and_exact_chart_pairs(self):
        rows = karmada.parse_page(MATRIX.encode())
        self.assertEqual([r["version"] for r in rows], ["1.19.0", "1.18.0", "1.17.0"])
        self.assertEqual(rows[0]["kube"], [f"1.{i}" for i in range(36, 26, -1)])
        for row in rows[1:]:
            self.assertEqual(row["kube"], [f"1.{i}" for i in range(35, 25, -1)])
        charts = chart_versions()
        self.assertEqual(charts["1.18.1"], "1.18.1")
        self.assertEqual([charts[r["version"]] for r in rows], ["1.19.0", "1.18.0", "1.17.0"])

    def test_partial_and_blank_cells_are_not_supported(self):
        text = """## Kubernetes compatibility
| | Kubernetes 1.29 | Kubernetes 1.30 | Kubernetes 1.31 | Kubernetes 1.32 |
|---|---|---|---|---|
| Karmada v1.19 | + | ✓ | - | |
"""
        self.assertEqual(karmada.parse_page(text)[0]["kube"], ["1.30"])

    def test_preserves_explicit_patch(self):
        rows = karmada.parse_page(MATRIX.replace("Karmada v1.19 ", "Karmada v1.19.2 "))
        self.assertEqual(rows[0]["version"], "1.19.2")

    def test_skips_empty_matching_table(self):
        empty = "\n| | Kubernetes 1.36 |\n|---|---|\n\n"
        text = MATRIX.replace("## Kubernetes compatibility", "## Kubernetes compatibility\n" + empty)
        self.assertEqual(len(karmada.parse_page(text)), 3)

    def test_ignores_tables_outside_compatibility_section(self):
        text = "## Other section\n| | Kubernetes 9.99 |\n|---|---|\n| Karmada v9.99 | ✓ |\n\n"
        rows = karmada.parse_page(text + MATRIX + text)
        self.assertEqual(len(rows), 3)

    def test_bad_rows_fail_whole_parse(self):
        changes = [
            MATRIX.replace("Karmada v1.19", "Karmada v1.19-rc1"),
            MATRIX.replace("Karmada v1.18", "Karmada v1.19"),
            MATRIX.replace("✓", "?", 1),
            MATRIX.replace("Kubernetes 1.35", "Kubernetes 1.36", 1),
            MATRIX.replace("Kubernetes 1.35", "Kubernetes latest", 1),
            MATRIX.replace("✓               |", "", 1),
            MATRIX.replace("✓", ""),
            MATRIX.replace("## Kubernetes compatibility", "## Unrelated heading"),
        ]
        for content in changes:
            with self.subTest(content=content[:100]), self.assertRaises(ValueError):
                karmada.parse_page(content)

    def test_complete_scrape_resolves_charts_before_single_write(self):
        with patch.object(karmada, "fetch_page", return_value=MATRIX), patch.object(
            karmada, "get_chart_versions", return_value=chart_versions()
        ), patch.object(karmada, "update_compatibility_info") as update:
            karmada.scrape()
        update.assert_called_once()
        path, rows = update.call_args.args
        self.assertEqual(path, karmada.TARGET_FILE)
        self.assertEqual([r["chart_version"] for r in rows], ["1.19.0", "1.18.0", "1.17.0"])

    def test_missing_or_prerelease_chart_prevents_all_writes(self):
        for charts in ({}, {"1.19.0": "1.19.0"}, {"1.19.0": "1.19.0-rc1"}):
            with self.subTest(charts=charts), patch.object(
                karmada, "fetch_page", return_value=MATRIX
            ), patch.object(karmada, "get_chart_versions", return_value=charts), patch.object(
                karmada, "update_compatibility_info"
            ) as update, patch.object(karmada, "print_error") as error:
                karmada.scrape()
                update.assert_not_called()
                error.assert_called_once()

    def test_failed_sources_prevent_all_writes(self):
        for source in (None, "<html>Unavailable</html>"):
            with self.subTest(source=source), patch.object(
                karmada, "fetch_page", return_value=source
            ), patch.object(karmada, "get_chart_versions") as charts, patch.object(
                karmada, "update_compatibility_info"
            ) as update, patch.object(karmada, "print_error"):
                karmada.scrape()
                charts.assert_not_called()
                update.assert_not_called()

    def test_network_exception_preserves_existing_data(self):
        with patch.object(karmada, "fetch_page", side_effect=ConnectionError("unavailable")), patch.object(
            karmada, "update_compatibility_info"
        ) as update, patch.object(karmada, "print_error"):
            karmada.scrape()
            update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
