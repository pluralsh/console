import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
sys.modules.pop("utils", None)

scraper = importlib.import_module("scrapers.nginx-gateway-fabric")


class NginxGatewayFabricScraperTest(unittest.TestCase):
    def test_parse_kube_versions_accepts_ranges_and_rejects_notes(self):
        self.assertEqual(
            scraper._parse_kube_versions("1.31 - 1.35"),
            ["1.31", "1.32", "1.33", "1.34", "1.35"],
        )
        self.assertEqual(scraper._parse_kube_versions("see release notes"), [])

    @patch.object(
        scraper,
        "_default_images",
        return_value=["ghcr.io/nginx/nginx-gateway-fabric:2.6.7"],
    )
    def test_extract_table_data_skips_edge_release(self, _default_images):
        markdown = """\
| NGINX Gateway Fabric | Gateway API | Kubernetes |
|---|---|---|
| edge | 1.4 | 1.35 |
| 2.6.7 | 1.4 | 1.31 - 1.35 |
"""

        rows = scraper.extract_table_data(markdown)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], "2.6.7")
        self.assertEqual(rows[0]["kube"], ["1.31", "1.32", "1.33", "1.34", "1.35"])


if __name__ == "__main__":
    unittest.main()
