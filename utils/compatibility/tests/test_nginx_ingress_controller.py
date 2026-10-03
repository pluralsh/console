import importlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

COMPATIBILITY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COMPATIBILITY_DIR))
sys.modules.pop("utils", None)

scraper = importlib.import_module("scrapers.nginx-ingress-controller")


class NginxIngressControllerScraperTest(unittest.TestCase):
    def test_resolves_latest_release_shortcodes(self):
        self.assertEqual(
            scraper._resolve_shortcodes(
                "{{< nic-version >}} / {{< nic-helm-version >}}",
                "5.5.4",
                "2.6.4",
            ),
            "5.5.4 / 2.6.4",
        )

    @patch.object(scraper, "_default_image", return_value="nginx/nginx-ingress:5.5.4")
    def test_table_rows_parse_kube_range(self, _default_image):
        markdown = """\
| NIC version | Kubernetes version | Helm chart version |
|---|---|---|
| {{< nic-version >}} | 1.29 - 1.36 | {{< nic-helm-version >}} |
"""

        rows = scraper._table_rows(markdown, "5.5.4", "2.6.4")

        self.assertEqual(rows[0]["version"], "5.5.4")
        self.assertEqual(rows[0]["chart_version"], "2.6.4")
        self.assertEqual(rows[0]["kube"][0], "1.36")
        self.assertEqual(rows[0]["kube"][-1], "1.29")


if __name__ == "__main__":
    unittest.main()
