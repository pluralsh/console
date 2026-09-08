import importlib
import unittest
from unittest.mock import patch

scraper = importlib.import_module("scrapers.kube-state-metrics")
MATRIX = """#### Compatibility matrix

| kube-state-metrics | Kubernetes client-go Version |
|--------------------|:----------------------------:|
| **v2.19.0** | v1.35 |
| **v2.20.0** | v1.36 |
| **main** | v1.36 |
"""


class KubeStateMetricsTests(unittest.TestCase):
    def test_exact_documented_pairs_and_chart_versions(self):
        rows = scraper.parse_matrix(MATRIX.encode(), {"2.19.0": "7.4.0", "2.20.0": "8.4.2"})
        self.assertEqual(rows, [
            {"version": "2.19.0", "kube": ["1.35"], "chart_version": "7.4.0",
             "requirements": [], "incompatibilities": []},
            {"version": "2.20.0", "kube": ["1.36"], "chart_version": "8.4.2",
             "requirements": [], "incompatibilities": []},
        ])

    def test_unrelated_tables_are_ignored(self):
        unrelated = "| **v2.18.0** | v1.34 |\n"
        content = unrelated + MATRIX + "#### Other section\n" + unrelated
        rows = scraper.parse_matrix(content, {"2.18.0": "7.3.0", "2.20.0": "8.4.2"})
        self.assertEqual([r["version"] for r in rows], ["2.20.0"])

    def test_missing_or_unstable_versions_are_not_inferred(self):
        content = MATRIX + "| **v2.21.0-rc.0** | v1.37 |\n| **v2.22.0** | unknown |"
        rows = scraper.parse_matrix(content, {"2.20.0": "8.5.0-rc.0",
                                             "2.21.0-rc.0": "9.0.0", "2.22.0": "10.0.0"})
        self.assertEqual(rows, [])

    def test_fetch_or_parse_failure_preserves_existing_data(self):
        for content in (None, "# New README without a compatibility matrix"):
            with self.subTest(content=content), \
                 patch.object(scraper, "fetch_page", return_value=content), \
                 patch.object(scraper, "get_chart_versions", return_value={}), \
                 patch.object(scraper, "update_compatibility_info") as update:
                scraper.scrape()
                update.assert_not_called()

    def test_scrape_uses_shared_chart_and_update_helpers(self):
        with patch.object(scraper, "fetch_page", return_value=MATRIX), \
             patch.object(scraper, "get_chart_versions", return_value={"2.20.0": "8.4.2"}) as charts, \
             patch.object(scraper, "update_compatibility_info") as update:
            scraper.scrape()
            charts.assert_called_once_with("kube-state-metrics")
            self.assertEqual(update.call_args.args[0], "../../static/compatibilities/kube-state-metrics.yaml")
            self.assertEqual(update.call_args.args[1][0]["kube"], ["1.36"])


if __name__ == "__main__":
    unittest.main()
