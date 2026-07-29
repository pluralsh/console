import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
sys.modules.pop("utils", None)

scraper = importlib.import_module("scrapers.envoy-gateway")


class EnvoyGatewayScraperTest(unittest.TestCase):
    def test_matrix_rows_locates_columns_by_header(self):
        markdown = """\
| Kubernetes version | Notes | Envoy Gateway version |
|---|---|---|
| v1.35, v1.34 | stable | v1.8 |
"""

        self.assertEqual(
            scraper._matrix_rows(markdown),
            {"1.8": ["1.35", "1.34"]},
        )

    @patch.object(scraper, "fetch_page")
    def test_latest_patch_versions_ignore_prereleases(self, fetch_page):
        fetch_page.side_effect = [
            b"""[
                {"name": "v1.8.3"},
                {"name": "v1.8.4-rc.1"},
                {"name": "v1.8.2"},
                {"name": "latest"}
            ]"""
        ]

        self.assertEqual(scraper._latest_patch_versions(), {"1.8": "1.8.3"})

    @patch.object(scraper, "update_compatibility_info")
    @patch.object(scraper, "get_chart_images", return_value=None)
    @patch.object(scraper, "_latest_patch_versions", return_value={"0.6": "0.6.0"})
    @patch.object(
        scraper,
        "fetch_page",
        return_value=b"""\
| Envoy Gateway version | Kubernetes version |
|---|---|
| v0.6 | v1.28, v1.27 |
""",
    )
    def test_omits_chart_metadata_when_oci_version_is_unavailable(
        self,
        _fetch_page,
        _latest_patch_versions,
        _get_chart_images,
        update_compatibility_info,
    ):
        scraper.scrape()

        rows = update_compatibility_info.call_args.args[1]
        self.assertNotIn("chart_version", rows[0])
        self.assertNotIn("images", rows[0])


if __name__ == "__main__":
    unittest.main()
