import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
yunikorn = importlib.import_module("scrapers.yunikorn")

SUPPORT_TABLE = """
<table><thead><tr><th>K8s Version</th>
<th>Supported <br/>from version</th><th>Support ended</th></tr></thead><tbody>
<tr><td>1.12.x (or earlier)</td><td>-</td><td>-</td></tr>
<tr><td>1.21.x</td><td>0.12.1</td><td>1.3.0</td></tr>
<tr><td>1.23.x</td><td>0.12.2</td><td>1.3.0</td></tr>
<tr><td>1.24.x</td><td>1.0.0</td><td>-</td></tr>
<tr><td>1.35.x</td><td>1.9.0</td><td>-</td></tr>
</tbody></table>
"""


class YuniKornScraperTest(unittest.TestCase):
    def test_support_start_and_end_are_inclusive(self):
        rows = yunikorn.build_rows(
            {v: v for v in ["0.12.1", "0.12.2", "1.3.0", "1.4.0", "1.9.0"]},
            yunikorn.parse_support_ranges(SUPPORT_TABLE),
        )
        by_version = {row["version"]: row["kube"] for row in rows}
        self.assertEqual(by_version["0.12.1"], ["1.21"])
        self.assertEqual(by_version["0.12.2"], ["1.21", "1.23"])
        self.assertEqual(by_version["1.3.0"], ["1.21", "1.23", "1.24"])
        self.assertEqual(by_version["1.4.0"], ["1.24"])
        self.assertEqual(by_version["1.9.0"], ["1.24", "1.35"])

    def test_ignores_unrelated_tables(self):
        unrelated = "<table><tr><th>Version</th></tr><tr><td>99.0.0</td></tr></table>"
        ranges = yunikorn.parse_support_ranges(unrelated + SUPPORT_TABLE)
        self.assertEqual([row[0] for row in ranges], ["1.21", "1.23", "1.24", "1.35"])

    def test_only_stable_supported_charts_are_emitted(self):
        rows = yunikorn.build_rows(
            {"1.9.0": "1.9.1", "1.10.0-rc.1": "1.10.0-rc.1",
             "1.8.0": "1.8.1-rc.1", "0.1.0": "0.1.0", "invalid": "1.0.0"},
            yunikorn.parse_support_ranges(SUPPORT_TABLE),
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "1.9.0")
        self.assertEqual(rows[0]["chart_version"], "1.9.1")

    def test_malformed_source_does_not_update_catalog(self):
        invalid_sources = [
            None,
            "<html>Service unavailable</html>",
            SUPPORT_TABLE.replace("0.12.1", "unknown"),
            SUPPORT_TABLE.replace("<td>1.3.0</td>", "<td>0.1.0</td>"),
            SUPPORT_TABLE.replace("<td>1.35.x</td>", "<td>1.35-1.40</td>"),
        ]
        for content in invalid_sources:
            with self.subTest(content=content), patch.object(yunikorn, "fetch_page", return_value=content), \
                    patch.object(yunikorn, "update_compatibility_info") as update:
                with self.assertRaises(ValueError):
                    yunikorn.scrape()
                update.assert_not_called()

    def test_missing_charts_do_not_update_catalog(self):
        with patch.object(yunikorn, "fetch_page", return_value=SUPPORT_TABLE), \
                patch.object(yunikorn, "get_chart_versions", return_value={}), \
                patch.object(yunikorn, "update_compatibility_info") as update:
            with self.assertRaises(ValueError):
                yunikorn.scrape()
            update.assert_not_called()

    def test_scrape_passes_mapped_rows_to_existing_writer(self):
        with patch.object(yunikorn, "fetch_page", return_value=SUPPORT_TABLE), \
                patch.object(yunikorn, "get_chart_versions", return_value={"1.9.0": "1.9.0"}), \
                patch.object(yunikorn, "update_compatibility_info") as update:
            yunikorn.scrape()
            path, rows = update.call_args.args
            self.assertEqual(path, "../../static/compatibilities/yunikorn.yaml")
            self.assertEqual(rows[0]["kube"], ["1.24", "1.35"])


if __name__ == "__main__":
    unittest.main()
