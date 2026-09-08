import importlib.util
from pathlib import Path
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch


path = Path(__file__).parents[1] / "scrapers" / "ibm-powervs-block-csi-driver.py"
spec = importlib.util.spec_from_file_location("powervs_scraper", path)
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)

# Representative rows from the upstream README's compatibility matrix.
MATRIX = """# CSI Specification Compatibility Matrix
| PowerVS CSI Driver | Kubernetes | CSI | Golang |
| --- | --- | --- | --- |
| main | 1.36.4 | 1.13.0 | 1.26.0 |
| 0.13.1 | 1.36.3 | 1.13.0 | 1.26.0 |
| 0.9.0 | 1.32 | 1.11.0 | 1.23 |
| 0.10.0 | 1.33.3 | 1.11.0 | 1.24.6 |

# Features
| type | tier1 |
"""


class PowerVSTests(unittest.TestCase):
    def test_released_rows_only_sorted_numerically(self):
        rows = scraper.parse_compatibilities(MATRIX)
        self.assertEqual([r["version"] for r in rows], ["0.13.1", "0.10.0", "0.9.0"])
        self.assertEqual([r["kube"] for r in rows], [["1.36"], ["1.33"], ["1.32"]])
        self.assertEqual(rows[0]["requirements"], [])
        self.assertNotIn("chart_version", rows[0])

    def test_fetch_bytes_and_markdown_heading_levels(self):
        self.assertEqual(
            scraper.parse_compatibilities(MATRIX),
            scraper.parse_compatibilities(MATRIX.replace("# CSI", "## CSI").encode()),
        )

    def test_ignores_tables_outside_target_section(self):
        prefix = "# Unrelated\n| 9.0.0 | 1.99 | x | x |\n"
        self.assertEqual(scraper.parse_compatibilities(prefix + MATRIX), scraper.parse_compatibilities(MATRIX))

    def test_missing_or_changed_header_does_not_guess_columns(self):
        for source in ("# Other\n", MATRIX.replace("| Kubernetes | CSI |", "| CSI | Kubernetes |")):
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_compatibilities(source)

    def test_rejects_malformed_rows_and_unsupported_ranges(self):
        for source in (
            MATRIX.replace("1.36.3", "1.36-1.37"),
            MATRIX.replace("0.13.1", "0.13.1-rc.1"),
            MATRIX.replace("| 0.13.1 |", "| extra | 0.13.1 |"),
            MATRIX.replace("| --- | --- | --- | --- |", "| changed | --- | --- | --- |"),
        ):
            with self.subTest(source=source), self.assertRaises(ValueError):
                scraper.parse_compatibilities(source)

    def test_duplicate_version_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            scraper.parse_compatibilities(MATRIX.replace("0.10.0", "0.13.1"))

    def test_development_only_matrix_rejected(self):
        source = "\n".join(line for line in MATRIX.splitlines() if not line.startswith("| 0."))
        with self.assertRaisesRegex(ValueError, "No released"):
            scraper.parse_compatibilities(source)

    def test_scrape_updates_only_after_valid_parse(self):
        utils = ModuleType("utils")
        utils.fetch_page = Mock(return_value=MATRIX.encode())
        utils.update_compatibility_info = Mock()
        with patch.dict(sys.modules, {"utils": utils}):
            scraper.scrape()
        utils.fetch_page.assert_called_once_with(scraper.compatibility_url)
        utils.update_compatibility_info.assert_called_once_with(
            "../../static/compatibilities/ibm-powervs-block-csi-driver.yaml",
            scraper.parse_compatibilities(MATRIX),
        )

    def test_fetch_or_parse_failure_never_updates_table(self):
        for content in (None, b"", b"# Unexpected README"):
            utils = ModuleType("utils")
            utils.fetch_page = Mock(return_value=content)
            utils.update_compatibility_info = Mock()
            with self.subTest(content=content), patch.dict(sys.modules, {"utils": utils}):
                with self.assertRaises(ValueError):
                    scraper.scrape()
            utils.update_compatibility_info.assert_not_called()


if __name__ == "__main__":
    unittest.main()
